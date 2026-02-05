# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DA MCP is a remote Model Context Protocol (MCP) server for Document Authoring (DA). It provides LLM assistants with direct access to DA management operations via Cloudflare Workers with streamable HTTP transport.

**Architecture flow:** MCP Client → Cloudflare Worker (10 tools) → DA Admin API (admin.da.live)

## Development Commands

```bash
npm run dev              # Local development with hot reload (http://localhost:8787)
npm run lint             # ESLint check
npm run test             # Run Vitest tests
npm run test:watch       # Run tests in watch mode
npm run type-check       # TypeScript type checking without emit
npm run deploy           # Deploy to production Cloudflare Workers
npm run deploy:ci        # Deploy to CI environment with versioned config
npm run deploy:production # Deploy to production with versioned config
```

**Local endpoints:**
- Health: `http://localhost:8787/health`
- MCP: `http://localhost:8787/mcp`

**Test with MCP Inspector:** Connect to `http://localhost:8787/mcp` with `Authorization: Bearer YOUR_DA_TOKEN` header.

## Code Structure

```
src/
├── index.ts           # Cloudflare Worker entry point, request routing, token extraction
├── mcp/
│   ├── server.ts      # MCP server with JSON-RPC handler, tool registry
│   ├── tools.ts       # Tool definitions with Zod schemas
│   └── handlers.ts    # Tool implementation handlers (one per tool)
└── da-admin/
    ├── client.ts      # DA Admin API HTTP client with token pass-through
    └── types.ts       # TypeScript interfaces for API responses
```

## Key Patterns

- **Token pass-through:** Authorization header extracted in `index.ts`, passed to `DAAdminClient`, forwarded to DA Admin API
- **Handler pattern:** Each of the 10 tools has a dedicated handler in `handlers.ts` that calls `DAAdminClient`
- **FormData for content:** Create/update operations use `FormData` with `Blob` for file content
- **30-second timeout:** All API requests have AbortController timeout

## Tools

All tools accept `org` and `repo` parameters plus operation-specific params:

| Tool | Purpose |
|------|---------|
| `da_list_sources` | List files/directories at path |
| `da_get_source` | Get file content |
| `da_create_source` | Create new file |
| `da_update_source` | Update existing file |
| `da_delete_source` | Delete file |
| `da_copy_content` | Copy between locations |
| `da_move_content` | Move between locations |
| `da_get_versions` | Get version history |
| `da_lookup_media` | Get media asset info |
| `da_lookup_fragment` | Get fragment info |

## Deployment

- **wrangler.toml:** Three environments (dev, ci, production), all use `admin.da.live` as BASE_URL
- **Semantic release:** Automated versioning on main branch via GitHub Actions
- **prepare-deploy.js:** Replaces `@@VERSION@@` placeholder in wrangler.toml before deployment

## Public Endpoints

- Direct: `https://da-mcp.franklin-prod.workers.dev/mcp`
- IMS-authenticated: `https://mcp.adobeaemcloud.com/adobe/mcp/da`
