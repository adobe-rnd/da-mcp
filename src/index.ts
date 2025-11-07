/**
 * Cloudflare Worker Entry Point
 * Main handler for the DA Live Admin MCP Server
 */

import { createMCPServer } from './mcp/server';

export interface Env {
  ENVIRONMENT?: string;
  DA_ADMIN_BASE_URL?: string;
  DA_ADMIN_API_TOKEN?: string; // Optional fallback token for testing
}

/**
 * CORS headers for cross-origin requests
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
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
 * Handle CORS preflight requests
 */
function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Create error response
 */
function errorResponse(message: string, status: number = 500): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    }
  );
}

/**
 * Create success response
 */
function successResponse(data: any, status: number = 200): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    }
  );
}

/**
 * Handle health check endpoint
 */
function handleHealthCheck(env: Env): Response {
  return successResponse({
    status: 'healthy',
    service: 'mcp-da-admin',
    version: '1.0.0',
    environment: env.ENVIRONMENT || 'development',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle MCP JSON-RPC requests
 */
async function handleMCP(request: Request, env: Env): Promise<Response> {
  // Extract and validate API token
  const apiToken = extractToken(request, env);

  if (!apiToken) {
    return errorResponse('Missing DA Admin API token. Please provide it in the Authorization header.', 401);
  }

  // Only accept POST requests with JSON body
  if (request.method !== 'POST') {
    return errorResponse('MCP endpoint only accepts POST requests', 405);
  }

  try {
    // Parse JSON-RPC request
    const jsonrpcRequest = await request.json();

    // Create MCP server with the user's DA API token
    const server = createMCPServer(apiToken, env.DA_ADMIN_BASE_URL);

    // Process the request through MCP server
    const response = await server.handleRequest(jsonrpcRequest);

    // Return JSON-RPC response
    return successResponse(response);
  } catch (error) {
    console.error('MCP handler error:', error);

    const message = error instanceof Error ? error.message : 'Internal server error';
    return errorResponse(`MCP Error: ${message}`, 500);
  }
}

/**
 * Main Worker fetch handler
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    // Route requests
    switch (url.pathname) {
      case '/':
      case '/health':
        return handleHealthCheck(env);

      case '/mcp':
        return handleMCP(request, env);

      default:
        return errorResponse('Not found', 404);
    }
  },
};
