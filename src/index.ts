/**
 * Cloudflare Worker Entry Point
 * Main handler for the da-mcp Server
 */

import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { DAAdminClient } from './da-admin/client';
import { createServer } from './mcp/server';

export interface Env {
  ENVIRONMENT?: string;
  VERSION?: string;
  DA_ADMIN_API_TOKEN?: string; // Optional fallback token for testing
  daadmin: Fetcher; // Service binding to DA Admin worker
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
};

/**
 * Extract DA API token from Authorization header
 */
function extractToken(request: Request, env: Env): string | null {
  const authHeader = request.headers.get('Authorization');

  if (authHeader) {
    // Support "Bearer TOKEN" or just "TOKEN"
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
    if (parts.length === 1) {
      return parts[0];
    }
  }

  // Fallback to environment variable for testing
  return env.DA_ADMIN_API_TOKEN || null;
}

/**
 * Handle health check endpoint
 */
function handleHealthCheck(env: Env): Response {
  return new Response(
    JSON.stringify({
      status: 'healthy',
      service: 'da-mcp',
      version: env.VERSION,
      environment: env.ENVIRONMENT || 'development',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    },
  );
}

/**
 * Main Worker fetch handler
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check — no auth required
    if (url.pathname === '/' || url.pathname === '/health') {
      return handleHealthCheck(env);
    }

    // Auth gate before MCP handling
    const token = extractToken(request, env);
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Missing DA Admin API token. Please provide it in the Authorization header.' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
      );
    }

    // Create fresh client + server per request to prevent cross-client data leaks
    const client = new DAAdminClient({ apiToken: token, daadminService: env.daadmin });
    const server = createServer(client, env.VERSION ?? 'unknown');

    // Stateless transport — new instance per request for Cloudflare Workers
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);

    // Delegate MCP protocol handling to the SDK transport
    const mcpResponse = await transport.handleRequest(request);

    // Add CORS headers to transport response
    const headers = new Headers(mcpResponse.headers);
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      headers.set(key, value);
    }
    return new Response(mcpResponse.body, { status: mcpResponse.status, headers });
  },
};
