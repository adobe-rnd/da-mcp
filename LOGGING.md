# Logging Reference

The MCP server includes comprehensive logging at every layer to help you debug and monitor operations.

## Log Levels and Emojis

The logs use emojis to make it easy to scan and identify different types of operations:

- `===` Boundaries for request start/end
- `✅` Success operations
- `❌` Errors and failures
- `📥` Incoming requests
- `📤` Outgoing responses
- `🔧` MCP server processing
- `📋` Parameters and data
- `🔨` Tool execution
- `📚` Tool listings
- `🚀` Initialization
- `🌐` DA Admin API calls
- `⏱️` Response times and timeouts

## Example Log Output

### Complete Request Flow

```
=== MCP Request Received ===
Timestamp: 2025-01-07T12:34:56.789Z
Method: POST
URL: https://mcp-da-admin.workers.dev/mcp
✅ Authentication: Token present (length: 32 )
📥 JSON-RPC Request: {
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "da_list_sources",
    "arguments": {
      "org": "adobe",
      "repo": "my-docs",
      "path": ""
    }
  }
}
🔧 MCP Server: Processing method: tools/call
📋 MCP Server: Method params: {
  "name": "da_list_sources",
  "arguments": {
    "org": "adobe",
    "repo": "my-docs",
    "path": ""
  }
}
🔨 MCP Server: Executing tool: da_list_sources
🌐 DA Admin API Call:
  Method: GET
  Endpoint: /api/v1/source/adobe/my-docs
  Full URL: https://admin.da.live/api/v1/source/adobe/my-docs
⏱️  DA Admin API Response: 200 OK (245ms)
✅ DA Admin API Result: {
  "sources": [
    {
      "name": "index.md",
      "path": "index.md",
      "type": "file",
      "lastModified": "2025-01-07T10:30:00Z"
    },
    {
      "name": "docs",
      "path": "docs",
      "type": "directory"
    }
  ],
  "path": "",
  "org": "adobe",
  "repo": "my-docs"
}
✅ MCP Server: Tool execution completed
✅ MCP Server: Request handled successfully
📤 JSON-RPC Response: {
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"sources\": [...],\n  ...\n}"
      }
    ]
  }
}
=== MCP Request Completed ===

```

### Initialization Request

```
=== MCP Request Received ===
Timestamp: 2025-01-07T12:34:50.123Z
Method: POST
URL: https://mcp-da-admin.workers.dev/mcp
✅ Authentication: Token present (length: 32 )
📥 JSON-RPC Request: {
  "jsonrpc": "2.0",
  "id": 0,
  "method": "initialize",
  "params": {}
}
🔧 MCP Server: Processing method: initialize
🚀 MCP Server: Initializing connection
✅ MCP Server: Request handled successfully
📤 JSON-RPC Response: {
  "jsonrpc": "2.0",
  "id": 0,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "da-live-admin",
      "version": "1.0.0"
    }
  }
}
=== MCP Request Completed ===

```

### Tools List Request

```
=== MCP Request Received ===
Timestamp: 2025-01-07T12:34:51.456Z
Method: POST
URL: https://mcp-da-admin.workers.dev/mcp
✅ Authentication: Token present (length: 32 )
📥 JSON-RPC Request: {
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
🔧 MCP Server: Processing method: tools/list
📚 MCP Server: Returning list of 12 tools
✅ MCP Server: Request handled successfully
📤 JSON-RPC Response: {
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "da_list_sources",
        "description": "List all sources and directories...",
        "inputSchema": {...}
      },
      ...
    ]
  }
}
=== MCP Request Completed ===

```

### Error Scenarios

#### Authentication Error

```
=== MCP Request Received ===
Timestamp: 2025-01-07T12:35:00.000Z
Method: POST
URL: https://mcp-da-admin.workers.dev/mcp
❌ Authentication failed: No API token provided
```

#### DA Admin API Error

```
🌐 DA Admin API Call:
  Method: GET
  Endpoint: /api/v1/source/adobe/nonexistent-repo
  Full URL: https://admin.da.live/api/v1/source/adobe/nonexistent-repo
⏱️  DA Admin API Response: 404 Not Found (123ms)
❌ DA Admin API Error: {
  "status": 404,
  "message": "Repository not found"
}
❌ MCP handler error: Error: DA Admin API Error (404): Repository not found
=== MCP Request Failed ===

```

#### Timeout Error

```
🌐 DA Admin API Call:
  Method: GET
  Endpoint: /api/v1/source/adobe/slow-repo
  Full URL: https://admin.da.live/api/v1/source/adobe/slow-repo
⏱️  DA Admin API Timeout after 30000 ms
❌ DA Admin API Request Failed: {...}
```

## Viewing Logs

### Local Development

```bash
npm run dev
```

Logs will appear in your terminal in real-time.

### Production (Cloudflare Workers)

View real-time logs:

```bash
wrangler tail
```

View logs for specific environment:

```bash
wrangler tail --env production
```

Filter logs:

```bash
wrangler tail --format json | grep "DA Admin API"
```

### Cloudflare Dashboard

1. Go to Workers & Pages
2. Select your Worker
3. Click on "Logs" tab
4. View real-time or historical logs

## Log Structure

Every request follows this flow:

1. **Entry Point** (`src/index.ts`)
   - Request received
   - Authentication check
   - JSON-RPC parsing

2. **MCP Server** (`src/mcp/server.ts`)
   - Method routing
   - Tool execution

3. **DA Admin Client** (`src/da-admin/client.ts`)
   - API call details
   - Response status and timing
   - Result data

4. **Response** (`src/index.ts`)
   - Final JSON-RPC response
   - Request completion

## Tips for Debugging

1. **Look for emojis**: Quick visual scan to find errors (❌) or specific operations
2. **Check timestamps**: Identify when requests occurred
3. **Follow the flow**: Logs follow the request from entry to exit
4. **Response times**: Check ⏱️ logs to identify slow operations
5. **Full data**: All requests and responses are logged in full for debugging

## Performance Considerations

Logs include timing information:
- DA Admin API response times
- Total request duration (visible in Cloudflare metrics)

Use this to identify:
- Slow DA Admin API endpoints
- Network latency issues
- Timeout-prone operations

## Privacy & Security

**Note**: The logs include:
- ✅ Token length (not the actual token)
- ✅ Request/response data
- ✅ Error details

**Never logged**:
- ❌ Full API tokens
- ❌ User credentials

Logs are only visible to:
- Cloudflare Workers administrators
- Developers with Wrangler access
