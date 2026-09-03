# da-mcp

[![75% Vibe_Coded](https://img.shields.io/badge/75%25-Vibe_Coded-ff69b4?style=for-the-badge&logo=semanticrelease&logoColor=white)](https://github.com/ai-ecoverse/vibe-coded-badge-action)

A remote Model Context Protocol (MCP) server for Document Authoring (DA). This server provides LLM assistants like Claude or ChatGPT with direct access to DA management operations.

## Features

- **17 DA Admin Tools**: Complete set of tools for managing DA repositories, including preview/publish
- **Remote Access**: Deployable on Cloudflare Workers with global edge distribution
- **Streamable HTTP**: Modern MCP transport protocol for remote servers
- **Token Pass-through**: Simple authentication by passing DA API tokens through Authorization header
- **Production Ready**: Error handling, logging, CORS support, and health checks
- **TypeScript**: Fully typed codebase for reliability and maintainability

## Architecture

```
┌─────────────────┐
│   MCP Client    │
│ (Claude/Cursor) │
└────────┬────────┘
         │ Streamable HTTP
         │ + DA Token
         ↓
┌─────────────────────────┐
│  DA MCP                 │
│  ┌──────────────────┐   │
│  │   MCP Server     │   │
│  │   (17 Tools)     │   │
│  └──────────────────┘   │
└───────────┬─────────────┘
            │ HTTPS + Token
            ↓
┌─────────────────────────┐   ┌─────────────────────────┐
│  DA Admin API           │   │  AEM (HLX6) Admin API   │
│  (admin.da.live)        │   │  (api.aem.live)         │
└─────────────────────────┘   └─────────────────────────┘
```

## Project Structure

```
src/
├── index.ts              # Cloudflare Worker entry point
├── mcp/
│   ├── server.ts         # McpServer factory with registerTool() + Zod schemas
│   └── handlers.ts       # Tool implementation handlers
├── admin/
│   ├── admin-client.ts   # Facade routing to legacy or HLX6 client
│   └── detect.ts         # HLX6 migration detection (cached in KV)
├── da-admin/
│   ├── client.ts         # Legacy DA Admin API client (admin.da.live)
│   └── types.ts          # Shared TypeScript types + IAdminClient interface
└── aem-admin/
    ├── client.ts         # HLX6 AEM Admin API client (api.aem.live)
    └── types.ts          # HLX6-specific response types
```

## Available Tools

| Tool | Description |
|------|-------------|
| `da_list_sources` | List sources and directories in a repository |
| `da_get_source` | Get content of a specific source file |
| `da_create_source` | Create a new source file |
| `da_update_source` | Update an existing source file |
| `da_delete_source` | Delete a source file |
| `da_copy_content` | Copy content between locations |
| `da_move_content` | Move content between locations |
| `da_get_versions` | Get version history for a file |
| `da_create_version` | Create a snapshot version of a file |
| `da_get_version` | Get the content of a specific version of a file |
| `da_lookup_media` | Lookup media references |
| `da_lookup_fragment` | Lookup fragment references |
| `da_upload_media` | Upload an image or media file |
| `da_preview_content` | Preview (create/update) a document |
| `da_unpreview_content` | Remove a document's preview |
| `da_publish_content` | Publish a document to live |
| `da_unpublish_content` | Remove a document from live (unpublish) |

## Prerequisites

- Node.js 18+ and npm
- Cloudflare account (free tier works)
- Wrangler CLI installed (`npm install -g wrangler`)
- DA Admin API token

## Installation

1. **Clone and install dependencies:**

```bash
git clone <repository-url>
cd da-mcp
npm install
```

2. **Configure Wrangler:**

Edit `wrangler.toml` if needed to customize your deployment settings.

## Development

### Local Development

Run the server locally with hot reload:

```bash
npm run dev
```

The server will be available at `http://localhost:8787`

### Test Endpoints

- **Health check:** `http://localhost:8787/health`
- **MCP endpoint:** `http://localhost:8787/mcp`

### Testing with MCP Inspector

1. Start the local server: `npm run dev`
2. Open [MCP Inspector](https://inspector.modelcontextprotocol.io/)
3. Configure connection:
   - Type: `Streamable HTTP`
   - URL: `http://localhost:8787/mcp`
   - Headers: `Authorization: Bearer YOUR_DA_TOKEN`

## Deployment

### Deploy to Cloudflare Workers

```bash
# Deploy to production
npm run deploy

# Or deploy to development environment
wrangler deploy --env development
```

### Public URLs

After deployment, your MCP server is accessible at:

- **Direct MCP Endpoint:**  
  [`https://da-mcp.adobeaem.workers.dev/mcp`](https://da-mcp.adobeaem.workers.dev/mcp)

- **IMS-Authenticated via AEM API Router:**  
  [`https://mcp.adobeaemcloud.com/adobe/mcp/da`](https://mcp.adobeaemcloud.com/adobe/mcp/da)  
  (Supports Adobe IMS login. See the [Authentication](#authentication) section below for details.)

## Client Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or equivalent:

```json
{
  "mcpServers": {
    "da-live-admin": {
      "type": "streamable-http",
      "url": "https://da-mcp.adobeaem.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_DA_USER_IMS_TOKEN"
      }
    }
  }
}
```

### VS Code / Cursor

Add to `.vscode/mcp.json` or Cursor settings:

```json
{
  "mcpServers": {
    "da-admin-mcp-direct": {
      "url": "https://da-mcp.adobeaem.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_DA_USER_IMS_TOKEN"
      }
    },
    "da-prod-mcp": {
      "url": "https://mcp.adobeaemcloud.com/adobe/mcp/da"
    }
  }
}
```

## Authentication

The server uses simple token pass-through authentication:

1. Client sends DA Admin API token in the `Authorization` header
2. Server extracts the token and passes it to DA Admin API
3. All requests to DA Admin API use this token

**Authorization Header Format:**

```
Authorization: Bearer YOUR_DA_USER_IMS_TOKEN
```

or simply:

```
Authorization: YOUR_DA_USER_IMS_TOKEN
```

**Note:** If you are accessing the API through the public (authenticated) URL of the API router, IMS (Adobe Identity Management Service) login is automatically handled by the AEM API router. In this case, you do *not* need to provide a DA Admin API token in the `Authorization` header—the IMS login flow will provide authentication for you.

## Usage Examples

Once configured, you can ask your AI assistant to perform DA operations:

```
Claude, can you list all the sources in the adobe/my-docs repository?
```

```
Please get the content of docs/index.md from the adobe/my-docs repository.
```

```
Create a new file at docs/new-page.md with some markdown content.
```

## API Endpoints

### `GET /health`

Health check endpoint returning server status.

**Response:**
```json
{
  "status": "healthy",
  "service": "da-mcp",
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2025-01-07T12:00:00.000Z"
}
```

### `POST /mcp`

MCP protocol endpoint for tool execution. Requires `Authorization` header with DA Admin API token.

## Error Handling

All tools include comprehensive error handling:

- **401 Unauthorized**: Missing or invalid DA Admin token
- **404 Not Found**: Invalid endpoint
- **408 Timeout**: Request took longer than 30 seconds
- **500 Internal Error**: Server-side errors with details

Errors are formatted for easy understanding by LLM clients.

## Logging

The server logs important events and errors to Cloudflare Workers logs:

```bash
# View logs in real-time
wrangler tail

# View logs for specific environment
wrangler tail --env production
```

## Monitoring

Monitor your deployed Worker:

1. **Cloudflare Dashboard**: View invocations, errors, and performance
2. **Wrangler Tail**: Real-time logs (`wrangler tail`)
3. **Health Endpoint**: Regular health checks at `/health`

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request
