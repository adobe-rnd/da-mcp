# DA Live Admin - Remote MCP Server

A remote Model Context Protocol (MCP) server for Document Authoring (DA) Live Admin API, deployable on Cloudflare Workers. This server provides LLM assistants like Claude with direct access to DA repository management operations.

## Features

- **12 DA Admin Tools**: Complete set of tools for managing DA repositories
- **Remote Access**: Deployable on Cloudflare Workers with global edge distribution
- **Streamable HTTP**: Modern MCP transport protocol for remote servers
- **Token Pass-through**: Simple authentication by passing DA API tokens through Authorization header
- **Production Ready**: Error handling, logging, CORS support, and health checks
- **TypeScript**: Fully typed codebase for reliability and maintainability

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
| `da_get_config` | Get repository configuration |
| `da_update_config` | Update repository configuration |
| `da_lookup_media` | Lookup media references |
| `da_lookup_fragment` | Lookup fragment references |

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

3. **Set up secrets (optional):**

If you want a fallback token for testing:

```bash
wrangler secret put DA_ADMIN_API_TOKEN
# Enter your DA API token when prompted
```

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

After deployment, note your Worker URL (e.g., `https://mcp-da-admin.your-account.workers.dev`)

## Client Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or equivalent:

```json
{
  "mcpServers": {
    "da-live-admin": {
      "type": "streamable-http",
      "url": "https://mcp-da-admin.your-account.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_DA_ADMIN_TOKEN"
      }
    }
  }
}
```

### VS Code / Cursor

Add to `.vscode/mcp.json` or Cursor settings:

```json
{
  "servers": {
    "da-live-admin": {
      "type": "streamable-http",
      "url": "https://mcp-da-admin.your-account.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_DA_ADMIN_TOKEN"
      }
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
Authorization: Bearer YOUR_DA_ADMIN_TOKEN
```

or simply:

```
Authorization: YOUR_DA_ADMIN_TOKEN
```

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
  "service": "mcp-da-admin",
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2025-01-07T12:00:00.000Z"
}
```

### `POST /mcp`

MCP protocol endpoint for tool execution. Requires `Authorization` header with DA Admin API token.

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
│  Cloudflare Worker      │
│  ┌──────────────────┐   │
│  │   MCP Server     │   │
│  │   (12 Tools)     │   │
│  └──────────────────┘   │
└───────────┬─────────────┘
            │ HTTPS + Token
            ↓
┌─────────────────────────┐
│  DA Admin API           │
│  (admin.da.live)        │
└─────────────────────────┘
```

## Project Structure

```
src/
├── index.ts              # Cloudflare Worker entry point
├── mcp/
│   ├── server.ts         # MCP server initialization
│   ├── tools.ts          # Tool definitions (schemas)
│   └── handlers.ts       # Tool implementation handlers
└── da-admin/
    ├── client.ts         # DA Admin API client
    └── types.ts          # TypeScript types
```

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

## Security Considerations

- **Token Security**: DA Admin tokens are never logged or stored
- **HTTPS Only**: All communication is encrypted (enforced by Cloudflare)
- **CORS**: Configured for secure cross-origin requests
- **Input Validation**: All tool inputs are validated against schemas
- **Rate Limiting**: Inherits Cloudflare Workers rate limiting

## Troubleshooting

### "Missing DA Admin API token"

**Solution**: Ensure your MCP client configuration includes the Authorization header with your DA Admin API token.

### "Request timeout"

**Solution**: The default timeout is 30 seconds. Large operations may need optimization or the DA Admin API may be slow.

### "401 Unauthorized from DA API"

**Solution**: Your DA Admin token may be invalid or expired. Generate a new token and update your client configuration.

### Tools not appearing in Claude

**Solution**:
1. Restart Claude Desktop after configuration changes
2. Check the configuration file path is correct
3. Verify the Worker URL is accessible
4. Check Claude Desktop logs for connection errors

## Monitoring

Monitor your deployed Worker:

1. **Cloudflare Dashboard**: View invocations, errors, and performance
2. **Wrangler Tail**: Real-time logs (`wrangler tail`)
3. **Health Endpoint**: Regular health checks at `/health`

## Future Enhancements

- [ ] OAuth 2.1 authentication flow
- [ ] Cloudflare KV for token storage
- [ ] Rate limiting per user
- [ ] Advanced error recovery
- [ ] Caching for frequently accessed resources
- [ ] Webhook support for real-time updates

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [DA Live Documentation](https://da.live/)
- [Cloudflare MCP Guide](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)

## Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review Cloudflare Workers logs

---

Built with ❤️ using Model Context Protocol and Cloudflare Workers
