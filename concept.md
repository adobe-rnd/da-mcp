# Development Plan: Migrating MCP DA Live Admin to Cloudflare Remote Server

## Executive Summary

This plan outlines the migration of the [mcp-da-live-admin](https://github.com/kptdobe/mcp-da-live-admin/) MCP server from a local stdio-based implementation to a remote MCP server deployable on Cloudflare Workers with proper authentication, authorization, and the modern Streamable HTTP transport.

## Current State Analysis

### Existing Implementation
- **Type**: Local MCP server (stdio transport)
- **Runtime**: Node.js with `npx` execution
- **Authentication**: API token via environment variable (`DA_ADMIN_API_TOKEN`)
- **Purpose**: Provides tools for Document Authoring Admin API interactions
- **Tools**: Source management, versioning, content operations, media/fragment lookups

### Key Features to Preserve
1. List sources and directories in DA repositories
2. Manage source content (get, create, delete)
3. Handle content versioning
4. Copy and move content between locations
5. Manage configurations
6. Lookup Media and Fragment References

## Architecture Design

### Target Architecture
```
┌─────────────────┐
│   MCP Client    │
│ (Claude/Cursor) │
└────────┬────────┘
         │ Streamable HTTP
         │ + OAuth 2.1
         ↓
┌─────────────────────────┐
│  Cloudflare Worker      │
│  ┌──────────────────┐   │
│  │ OAuth Provider   │   │
│  │ (Authorization)  │   │
│  └──────────────────┘   │
│  ┌──────────────────┐   │
│  │   MCP Server     │   │
│  │   (Tools/Logic)  │   │
│  └──────────────────┘   │
└───────────┬─────────────┘
            │ HTTPS
            ↓
┌─────────────────────────┐
│  DA Admin API           │
│  (Document Authoring)   │
└─────────────────────────┘
```

### Technology Stack
- **Platform**: Cloudflare Workers
- **Transport**: Streamable HTTP (replaces stdio)
- **Authentication**: OAuth 2.1 with Dynamic Client Registration
- **Authorization Library**: `workers-oauth-provider`
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **Storage**: Cloudflare Workers KV (for OAuth state/tokens if needed)
- **Secrets Management**: Wrangler secrets

## Phase 1: Project Setup & Dependencies

### 1.1 Initialize Cloudflare Worker Project
```bash
npm create cloudflare@latest mcp-da-live-admin-remote
# Choose "Hello World" Worker template
cd mcp-da-live-admin-remote
```

### 1.2 Install Dependencies
```bash
npm install @modelcontextprotocol/sdk
npm install workers-oauth-provider
npm install @cloudflare/workers-types --save-dev
```

### 1.3 Project Structure
```
mcp-da-live-admin-remote/
├── src/
│   ├── index.ts              # Main Worker entry point
│   ├── mcp/
│   │   ├── server.ts         # MCP server initialization
│   │   ├── tools.ts          # Tool definitions
│   │   └── handlers.ts       # Tool implementation handlers
│   ├── da-admin/
│   │   ├── client.ts         # DA Admin API client
│   │   └── types.ts          # TypeScript types for DA API
│   └── auth/
│       └── oauth-config.ts   # OAuth configuration
├── wrangler.toml             # Cloudflare Worker configuration
├── package.json
└── tsconfig.json
```

## Phase 2: Core Migration

### 2.1 DA Admin API Client Module
**File**: `src/da-admin/client.ts`

**Purpose**: Encapsulate all DA Admin API interactions

**Key Components**:
- HTTP client wrapper with authentication
- Error handling and retry logic
- Rate limiting handling
- Type-safe API methods

**Implementation Tasks**:
1. Create base HTTP client class
2. Implement authentication header injection
3. Map existing tool operations to API endpoints:
   - `listSources()` 
   - `getSource()`
   - `createSource()`
   - `deleteSource()`
   - `copyContent()`
   - `moveContent()`
   - `getVersions()`
   - `getConfig()`
   - `lookupMedia()`
   - `lookupFragment()`

**Example Structure**:
```typescript
export class DAAdminClient {
  constructor(
    private apiToken: string,
    private baseUrl: string = 'https://admin.da.live'
  ) {}

  async listSources(org: string, repo: string, path?: string) {
    // Implementation
  }

  // ... other methods
}
```

### 2.2 MCP Tool Definitions
**File**: `src/mcp/tools.ts`

**Purpose**: Define MCP tool schemas that map to DA Admin operations

**Implementation Tasks**:
1. Convert each DA Admin operation to MCP tool schema
2. Define input parameters with proper validation
3. Add comprehensive descriptions for LLM understanding
4. Include examples in tool descriptions

**Example Tool Schema**:
```typescript
export const listSourcesTool = {
  name: "da_list_sources",
  description: "List all sources and directories in a DA repository at a given path",
  inputSchema: {
    type: "object",
    properties: {
      org: {
        type: "string",
        description: "Organization name"
      },
      repo: {
        type: "string", 
        description: "Repository name"
      },
      path: {
        type: "string",
        description: "Optional path within repository",
        default: ""
      }
    },
    required: ["org", "repo"]
  }
};
```

### 2.3 Tool Handlers
**File**: `src/mcp/handlers.ts`

**Purpose**: Implement the business logic for each MCP tool

**Implementation Tasks**:
1. Create handler functions that receive tool arguments
2. Call DA Admin API client methods
3. Format responses for MCP clients
4. Handle errors gracefully
5. Add logging for debugging

### 2.4 MCP Server Initialization
**File**: `src/mcp/server.ts`

**Purpose**: Initialize and configure the MCP server with Streamable HTTP transport

**Implementation Tasks**:
1. Create MCP server instance
2. Register all tools
3. Configure Streamable HTTP transport
4. Add tool invocation routing
5. Implement server info/capabilities

**Key Code Pattern**:
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export function createMCPServer(apiToken: string) {
  const server = new Server(
    {
      name: "da-live-admin",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tools
  registerTools(server, apiToken);

  return server;
}
```

## Phase 3: OAuth Implementation

### 3.1 OAuth Provider Setup
**File**: `src/auth/oauth-config.ts`

**Purpose**: Configure OAuth 2.1 authorization for secure access

**Implementation Decision**: Use self-managed OAuth (Worker handles full flow)

**Configuration Tasks**:
1. Define OAuth scopes (e.g., `da:read`, `da:write`, `da:admin`)
2. Configure client registration endpoint
3. Set up authorization endpoint
4. Configure token endpoint
5. Add refresh token support

**Key Configuration**:
```typescript
import { OAuthProvider } from 'workers-oauth-provider';

export function createOAuthProvider(env: Env) {
  return new OAuthProvider({
    issuer: 'https://mcp-da-admin.your-account.workers.dev',
    scopes: {
      'da:read': 'Read access to DA repositories',
      'da:write': 'Write access to DA repositories',
      'da:admin': 'Administrative access to DA repositories',
    },
    // Additional configuration
  });
}
```

### 3.2 User Authentication Flow
**Implementation Options**:

**Option A: Worker-Managed Auth** (Recommended for simplicity)
- Store DA API tokens per user in Cloudflare KV
- Users authenticate once, provide their DA token
- Worker stores and reuses token for subsequent requests

**Option B: Third-Party Provider Integration**
- Integrate with Auth0, Stytch, or WorkOS
- Use their identity management
- Map users to DA API tokens

### 3.3 Authorization Middleware
**Purpose**: Validate OAuth tokens before tool execution

**Implementation Tasks**:
1. Token validation on each request
2. Scope checking per tool
3. Rate limiting per user
4. Token refresh handling

## Phase 4: Worker Entry Point

### 4.1 Main Worker Handler
**File**: `src/index.ts`

**Purpose**: Route requests and integrate OAuth + MCP

**Implementation Tasks**:
1. Create main `fetch` handler
2. Route OAuth endpoints (authorization, token, registration)
3. Route MCP endpoints (`/mcp` for Streamable HTTP)
4. Add CORS headers for web clients
5. Implement health check endpoint

**Structure**:
```typescript
import { OAuthProvider } from 'workers-oauth-provider';
import { createMCPServer } from './mcp/server';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // OAuth endpoints
    if (url.pathname.startsWith('/oauth/')) {
      return oauthProvider.fetch(request, env, ctx);
    }
    
    // MCP endpoint
    if (url.pathname === '/mcp') {
      // Validate OAuth token
      const user = await validateToken(request, env);
      
      // Get user's DA API token
      const daToken = await getUserDAToken(user.id, env);
      
      // Create MCP server with user's token
      const server = createMCPServer(daToken);
      
      // Handle MCP request
      return handleMCPRequest(request, server);
    }
    
    return new Response('Not Found', { status: 404 });
  }
};
```

## Phase 5: Configuration & Deployment

### 5.1 Wrangler Configuration
**File**: `wrangler.toml`

```toml
name = "mcp-da-admin-remote"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
name = "mcp-da-admin"
route = "mcp-da-admin.your-account.workers.dev/*"

[[kv_namespaces]]
binding = "USER_TOKENS"
id = "your-kv-namespace-id"

[vars]
ENVIRONMENT = "production"
```

### 5.2 Secrets Configuration
```bash
# Set secrets via Wrangler CLI
wrangler secret put DA_ADMIN_BASE_URL
# Enter: https://admin.da.live

wrangler secret put OAUTH_SECRET
# Enter: generate-secure-random-string

# If using third-party OAuth:
wrangler secret put AUTH0_DOMAIN
wrangler secret put AUTH0_CLIENT_ID
wrangler secret put AUTH0_CLIENT_SECRET
```

### 5.3 Deployment Steps
```bash
# Test locally with Wrangler
npm run dev

# Deploy to Cloudflare
npm run deploy

# Or with Wrangler directly
wrangler deploy
```

## Phase 6: Client Configuration

### 6.1 MCP Client Setup (Claude Desktop)
**File**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "da-live-admin": {
      "type": "streamable-http",
      "url": "https://mcp-da-admin.your-account.workers.dev/mcp",
      "oauth": {
        "authorizationUrl": "https://mcp-da-admin.your-account.workers.dev/oauth/authorize",
        "tokenUrl": "https://mcp-da-admin.your-account.workers.dev/oauth/token"
      }
    }
  }
}
```

### 6.2 VS Code Configuration
**File**: `.vscode/mcp.json`

```json
{
  "servers": {
    "da-live-admin": {
      "type": "streamable-http",
      "url": "https://mcp-da-admin.your-account.workers.dev/mcp"
    }
  }
}
```

## Phase 7: Testing Strategy

### 7.1 Unit Tests
**Tools**: Vitest, Miniflare

**Test Coverage**:
- DA Admin API client methods
- Tool handler functions
- OAuth token validation
- Error handling paths

### 7.2 Integration Tests
**Test Scenarios**:
1. OAuth flow completion
2. Tool invocation with valid auth
3. Tool invocation with invalid auth
4. Rate limiting behavior
5. Token refresh flow

### 7.3 MCP Inspector Testing
Use Cloudflare's MCP Inspector:
```bash
# Run local server
npm run dev

# In browser
http://localhost:8787/mcp
```

Test each tool through the inspector UI

### 7.4 E2E Testing with Real Clients
1. Claude Desktop integration
2. VS Code Copilot integration
3. Cursor IDE integration

## Phase 8: Documentation

### 8.1 User Documentation
**Create**: `README.md`

**Sections**:
1. Overview of the MCP server
2. Prerequisites
3. Installation instructions for different clients
4. OAuth setup guide
5. Tool reference with examples
6. Troubleshooting guide

### 8.2 Developer Documentation
**Create**: `CONTRIBUTING.md`

**Sections**:
1. Development setup
2. Architecture overview
3. Adding new tools
4. Testing guidelines
5. Deployment process

### 8.3 API Documentation
**Create**: `docs/API.md`

**Content**:
- DA Admin API endpoints used
- MCP tool schemas
- OAuth scopes and permissions
- Error codes and handling

## Phase 9: Monitoring & Observability

### 9.1 Logging
**Implementation**:
- Structured logging with JSON format
- Log levels (debug, info, warn, error)
- Request/response logging
- Tool invocation logging

### 9.2 Metrics
**Track**:
- Request count per tool
- Response times
- Error rates
- OAuth flow completion rates
- Active users

### 9.3 Cloudflare Analytics
**Monitor**:
- Worker invocations
- CPU time usage
- Request success/failure rates
- Geographic distribution

### 9.4 Error Tracking
**Options**:
- Sentry integration
- Cloudflare Logpush
- Custom error aggregation

## Phase 10: Security Considerations

### 10.1 Authentication Security
- [ ] Use secure token storage (KV with encryption)
- [ ] Implement token rotation
- [ ] Add token expiration
- [ ] Rate limit authentication attempts

### 10.2 Authorization Security
- [ ] Validate scopes on every tool invocation
- [ ] Implement least-privilege access
- [ ] Audit log all sensitive operations
- [ ] Add user consent flows

### 10.3 API Security
- [ ] Validate all inputs
- [ ] Sanitize outputs
- [ ] Implement request signing
- [ ] Add CORS policies
- [ ] Use HTTPS only

### 10.4 Secrets Management
- [ ] Never log secrets
- [ ] Rotate secrets regularly
- [ ] Use Wrangler secrets (not env vars)
- [ ] Implement secret versioning

## Phase 11: Optimization

### 11.1 Performance Optimization
**Tasks**:
1. Implement response caching where appropriate
2. Batch API requests when possible
3. Use Cloudflare Workers KV for frequently accessed data
4. Minimize cold start time
5. Optimize bundle size

### 11.2 Cost Optimization
**Considerations**:
- Workers pricing: $5/10M requests
- KV pricing: $0.50/GB-month
- Optimize for request count
- Cache responses to reduce DA API calls

### 11.3 Scalability
**Design for**:
- Multiple concurrent users
- High request volume
- Global distribution (Cloudflare's edge network)
- Automatic scaling

## Phase 12: Migration Checklist

### Pre-Migration
- [ ] Audit existing local MCP server functionality
- [ ] Document all tools and their behaviors
- [ ] Identify all DA Admin API endpoints used
- [ ] Review authentication/authorization requirements

### Migration
- [ ] Set up Cloudflare account
- [ ] Create Worker project
- [ ] Implement DA Admin client
- [ ] Port all tool definitions
- [ ] Implement OAuth provider
- [ ] Create main Worker handler
- [ ] Configure secrets
- [ ] Deploy to staging environment

### Testing
- [ ] Unit test all components
- [ ] Integration test OAuth flow
- [ ] Test each tool with MCP Inspector
- [ ] Test with Claude Desktop
- [ ] Test with VS Code
- [ ] Load testing
- [ ] Security audit

### Deployment
- [ ] Deploy to production
- [ ] Update client configurations
- [ ] Monitor for errors
- [ ] Validate all tools work
- [ ] Performance testing in production

### Post-Deployment
- [ ] Update documentation
- [ ] Announce to users
- [ ] Monitor usage metrics
- [ ] Collect user feedback
- [ ] Address issues promptly

## Phase 13: Maintenance Plan

### 13.1 Regular Maintenance
**Weekly**:
- Review error logs
- Check performance metrics
- Monitor API usage

**Monthly**:
- Update dependencies
- Review security advisories
- Rotate secrets
- Capacity planning

**Quarterly**:
- Security audit
- Performance review
- Cost analysis
- Feature prioritization

### 13.2 Incident Response
**Process**:
1. Detect issue via monitoring
2. Assess impact and severity
3. Communicate to users
4. Implement fix
5. Deploy hotfix
6. Post-mortem analysis

## Success Criteria

### Functional Requirements
✅ All existing tools work identically to local version
✅ OAuth authentication flow completes successfully
✅ Works with Claude Desktop, VS Code, and Cursor
✅ Proper error handling and user feedback
✅ Response times under 2 seconds for most operations

### Non-Functional Requirements
✅ 99.9% uptime SLA
✅ Secure storage of user credentials
✅ Compliant with OAuth 2.1 specification
✅ Scalable to 100+ concurrent users
✅ Comprehensive documentation
✅ Monitoring and alerting in place

## Timeline Estimate

- **Phase 1-2 (Setup & Core Migration)**: 1-2 weeks
- **Phase 3 (OAuth Implementation)**: 1 week
- **Phase 4 (Worker Integration)**: 3-5 days
- **Phase 5 (Configuration & Deployment)**: 2-3 days
- **Phase 6 (Client Configuration)**: 1-2 days
- **Phase 7 (Testing)**: 1 week
- **Phase 8-9 (Documentation & Monitoring)**: 3-5 days
- **Phase 10 (Security Review)**: 3-5 days
- **Phase 11 (Optimization)**: 1 week

**Total Estimated Timeline**: 6-8 weeks for complete migration

## Resources & References

### Documentation
- [Cloudflare Workers MCP Guide](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Workers OAuth Provider](https://github.com/cloudflare/workers-oauth-provider)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)

### Example Implementations
- [Cloudflare MCP Server Examples](https://github.com/cloudflare/mcp-server-cloudflare)
- [GitHub MCP Server](https://github.com/github/github-mcp-server)
- [Auth0 + Cloudflare MCP Example](https://auth0.com/blog/secure-and-deploy-remote-mcp-servers-with-auth0-and-cloudflare/)

### Tools
- [MCP Inspector](https://inspector.modelcontextprotocol.io/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare AI Playground](https://playground.ai.cloudflare.com/)

## Conclusion

This migration plan provides a comprehensive roadmap to transform the local MCP DA Live Admin server into a production-ready remote MCP server on Cloudflare. The phased approach ensures systematic progress while maintaining functionality and security. The resulting server will be:

- **Accessible**: Users can connect from any MCP client without local setup
- **Secure**: OAuth 2.1 provides industry-standard authentication and authorization
- **Scalable**: Cloudflare's edge network ensures global performance
- **Maintainable**: Clear architecture and documentation enable ongoing development
- **Cost-effective**: Serverless architecture minimizes operational costs

By following this plan, you'll have a modern, cloud-native MCP server that extends the Document Authoring platform's capabilities to AI assistants worldwide.