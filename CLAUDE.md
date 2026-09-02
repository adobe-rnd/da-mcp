# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DA MCP is a remote Model Context Protocol (MCP) server for Document Authoring (DA). It provides LLM assistants with direct access to DA management operations via Cloudflare Workers with streamable HTTP transport.

**Architecture flow:** MCP Client → Cloudflare Worker (17 tools) → DA Admin API (admin.da.live) or AEM (HLX6) Admin API (api.aem.live); legacy preview/publish calls go to the Helix admin API (admin.hlx.page) instead

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
├── index.ts           # Cloudflare Worker entry point, token extraction, health check
├── mcp/
│   ├── server.ts      # McpServer factory with registerTool() + Zod schemas (one per tool)
│   └── handlers.ts    # Tool implementation handlers (one per tool)
├── da-admin/
│   ├── client.ts      # DA Admin API HTTP client with token pass-through
│   └── types.ts       # TypeScript interfaces for API responses
└── utils/
    └── path.ts        # Path normalization utilities
```

## Key Patterns

- **Token pass-through:** Authorization header extracted in `index.ts`, passed to `DAAdminClient`, forwarded to DA Admin API
- **SDK transport:** `WebStandardStreamableHTTPServerTransport` (stateless, per-request) handles MCP protocol — fresh `McpServer` + transport created per request
- **Tool registration:** Each tool registered via `server.registerTool()` with a Zod `inputSchema` in `server.ts`; business logic lives in `handlers.ts`
- **FormData for content:** Create/update/copy/move operations use `FormData` with `Blob` for file content
- **Copy/move API:** Endpoint is `/copy|move/{org}/{repo}/{sourcePath}`; body is FormData with `destination` = `/{org}/{repo}/{destinationPath}`
- **Empty responses:** `client.ts` reads body as text first; returns `{}` for empty/no-content responses (204 etc.)
- **30-second timeout:** All API requests have AbortController timeout
- **Path normalization:** All handlers normalize paths via `src/utils/path.ts` before passing to client; `.html` extension auto-added where needed
- **Preview/live on legacy DA:** `admin.da.live` has no preview/live routes of its own — `DAAdminClient.previewContent/unpreviewContent/publishContent/unpublishContent` call the Helix admin API (`admin.hlx.page`) directly via global `fetch()` instead of the `daadminService` binding, always targeting the `main` ref. Preview `POST` calls additionally send `x-content-source-authorization` alongside `Authorization`.

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
| `da_create_version` | Create a snapshot version of a file |
| `da_get_version` | Get the content of a specific version |
| `da_lookup_media` | Get media asset info |
| `da_lookup_fragment` | Get fragment info |
| `da_upload_media` | Upload binary media file |
| `da_preview_content` | Preview (create/update) a document |
| `da_unpreview_content` | Remove a document's preview |
| `da_publish_content` | Publish a document to live |
| `da_unpublish_content` | Remove a document from live (unpublish) |

## Deployment

- **wrangler.toml:** Three environments (dev, ci, production), all use `admin.da.live` as BASE_URL
- **Semantic release:** Automated versioning on main branch via GitHub Actions
- **prepare-deploy.js:** Replaces `@@VERSION@@` placeholder in wrangler.toml before deployment

## Public Endpoints

- Direct: `https://da-mcp.adobeaem.workers.dev/mcp`
- IMS-authenticated: `https://mcp.adobeaemcloud.com/adobe/mcp/da`
