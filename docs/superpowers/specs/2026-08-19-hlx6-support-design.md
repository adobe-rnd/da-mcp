# HLX6 Support for DA MCP — Design

## Context

AEM/Edge Delivery is migrating orgs/sites from the legacy admin stack
("HLX5", fronted by `admin.hlx.page` / `admin.da.live`) to a new stack
("HLX6", fronted by `api.aem.live`). A site only counts as HLX6 once it has
been explicitly migrated — this cannot be inferred from the org/repo name
and must be probed per org+repo pair.

Today, `src/da-admin/client.ts` (`DAAdminClient`) talks to DA's own admin
API (`admin.da.live`) exclusively, via a Cloudflare Worker **service
binding** (`env.daadmin: Fetcher`) rather than a direct `fetch()` call. All
11 da-mcp tools are backed by this single client.

This design adds a parallel client for HLX6-migrated org/repos that talks
directly to `https://api.aem.live` (an external host, not reachable via the
`daadmin` service binding), plus a detection mechanism to decide, per
request, which backend to use. A facade (`AdminClient`) hides the branching
so `src/mcp/handlers.ts` and `src/mcp/server.ts` do not need to change their
logic — only their type import.

This design was produced by reading `/Users/mhaack/Downloads/openapi-hlx6.json`
(AEM Admin API Service, v1.72.2) directly — endpoint shapes below are taken
from that spec, not inferred from the da-nx handoff doc (which documents a
different project's *browser-side* HLX6 pattern and does not cover the
`source` API's exact verb/body/response contract).

## Endpoint mapping

All legacy endpoints are called through the existing `daadmin` service
binding at fake origin `https://daadmin{endpoint}` (unchanged). All HLX6
endpoints are called via a direct `fetch()` to `https://api.aem.live`.

| Tool | Legacy | HLX6 | Calls |
|---|---|---|---|
| `da_list_sources` | `GET /list/{org}/{repo}/{path}` | `GET /{org}/sites/{repo}/source/{path}/` (trailing slash; empty path → `/{org}/sites/{repo}/source/`) | 1 |
| `da_get_source` | `GET /source/{org}/{repo}/{path}` | `GET /{org}/sites/{repo}/source/{path}` — raw body; headers `etag`, `content-type`, `content-length`, `x-last-modified-by` | 1 |
| `da_create_source` | `POST /source/...` FormData (`data` blob) | `POST /{org}/sites/{repo}/source/{path}`, raw body, `Content-Type` = contentType. 409 if exists. | 1 |
| `da_update_source` | `POST /source/...` FormData | `PUT /{org}/sites/{repo}/source/{path}`, raw body (create-or-replace) | 1 |
| `da_delete_source` | `DELETE /source/...` | `DELETE /{org}/sites/{repo}/source/{path}` (soft-delete to `.trash`); use `.../{path}/` variant when path is a folder | 1 |
| `da_copy_content` | `POST /copy/...` FormData `destination` | `PUT /{org}/sites/{repo}/source/{destPath}?source={srcPath}` — native atomic copy (also works for folders via the `.../{path}/` PUT variant, `source` required) | 1 |
| `da_move_content` | `POST /move/...` FormData `destination` | No native move: `PUT ...?source=` (copy) **then** `DELETE` original path | 2 |
| `da_get_versions` | `GET /versionlist/{org}/{repo}/{path}` | `GET /{org}/sites/{repo}/source/{path}/.versions` | 1 |
| `da_lookup_media` | `GET /source/...` binary | Same as `da_get_source`, binary passthrough | 1 |
| `da_lookup_fragment` | `GET /fragment/{org}/{repo}/{path}` | **No equivalent endpoint in the spec.** Best-effort fallback: plain `GET /source/{path}` on the fragment path, no recursive fragment/include resolution. Flagged as reduced-fidelity — needs product/API-team confirmation before being treated as a real feature-parity implementation. | 1 (degraded) |
| `da_upload_media` | `POST /source/...` FormData + filename | `PUT /{org}/sites/{repo}/source/{path}`, raw binary body, `Content-Type` = mimeType | 1 |

### Response normalization

To keep tool output shapes stable for MCP clients, HLX6 raw JSON responses
are mapped into the existing shared types in `src/da-admin/types.ts`:

- **List** (`folderListing`: `[{name, size, content-type, last-modified}]`)
  → `DASource[]` (`name`, `path` (computed: parent path + name),
  `type: 'file' | 'directory'` (derived from `content-type ===
  'application/folder'`), `lastModified`, `size`).
- **Versions** (`versionListing`:
  `[{version, doc-last-modified, doc-last-modified-by, version-date,
  version-by, version-operation, version-comment}]`) → `DAVersion[]`
  (`timestamp` ← parsed `version-date`, `path` ← `doc-path-hint` if present,
  `users` ← `[{email: version-by}]`). Fields with no legacy equivalent
  (`version-operation`, `version-comment`) are dropped, not invented on the
  legacy side.
- **Copy** (`{copied: [{src, dst}]}`) → `DAOperationResponse`
  (`success: true`, `path: dst`).

## HLX6 detection (`isHlx6`)

Located in `src/admin/detect.ts` (per your request, alongside the facade
rather than a separate `src/hlx6/` module).

```
isHlx6(org, repo, env): Promise<boolean>
```

- Check `env.HLX6_STATUS_KV` for key `${org}/${repo}` first.
- On cache miss: `fetch('https://admin.hlx.page/ping/{org}/{repo}')`
  (same host as da-nx's legacy `HLX_ADMIN`). Migrated ⇔ response contains
  header `x-api-upgrade-available` (any value).
- If migrated: `kv.put(key, 'true', { expirationTtl: 604800 })` (7 days).
- If **not** migrated: do not cache — always re-ping on next call, since an
  org can migrate at any time and a false negative should self-correct
  quickly rather than sticking for 7 days.
- **Fail-safe**: any ping error (timeout, network failure, non-2xx
  unrelated to the header check) is treated as `false` (legacy) and logged,
  never thrown — a broken ping must not block a legacy operation that would
  otherwise succeed.
- Every `AdminClient` method calls `isHlx6(org, repo, env)` first, then
  delegates to `DAAdminClient` or `AemAdminClient` accordingly. Since every
  da-mcp tool already requires both `org` and `repo`, there is no org-only
  case to special-case (unlike da-nx).

## Architecture / file layout

```
src/da-admin/
  client.ts          # unchanged — DAAdminClient, legacy admin.da.live via service binding
  types.ts           # unchanged — shared DASource, DAListSourcesResponse, DAVersion,
                      # DAOperationResponse, DAMediaContent, DAMediaReference, etc.

src/aem-admin/
  client.ts          # new — AemAdminClient, same method surface as DAAdminClient,
                      # talks to api.aem.live via direct fetch()
  types.ts           # new — raw HLX6 response shapes (folder listing entry,
                      # copyMoveEntry, versionListing entry)
  mappers.ts         # new — raw HLX6 JSON -> shared src/da-admin/types.ts shapes

src/admin/
  detect.ts          # new — isHlx6(org, repo, env), KV-backed
  admin-client.ts     # new — AdminClient facade: same public method signatures/
                      # return shapes as today's DAAdminClient; each method awaits
                      # isHlx6() then delegates to DAAdminClient or AemAdminClient
```

`src/index.ts` constructs `new AdminClient({ apiToken, daadminService: env.daadmin,
kv: env.HLX6_STATUS_KV, ... })` instead of `new DAAdminClient(...)`.
`src/mcp/handlers.ts` and `src/mcp/server.ts` only change their type import
from `DAAdminClient` to `AdminClient` — no other logic changes, because the
facade's method signatures and return shapes are identical to today's
`DAAdminClient`.

## Config changes

`wrangler.toml`:
- Add a KV namespace binding `HLX6_STATUS_KV` to each environment (dev, ci,
  production — separate namespace ids per environment, created via
  `wrangler kv namespace create`).
- Add optional vars `HLX_ADMIN_BASE_URL` (default `https://admin.hlx.page`)
  and `AEM_API_BASE_URL` (default `https://api.aem.live`), overridable in
  `[env.local]` and tests, mirroring the existing `DA_ADMIN_BASE_URL`
  pattern already present for local dev.

## Error handling

- `AemAdminClient` request errors follow the same `DAAPIError` shape
  (`status`, `message`, `details`) as `DAAdminClient.request()` today, so
  `formatError()` in `handlers.ts` needs no changes.
- A 401/403 from `api.aem.live` is surfaced as a normal tool error to the
  MCP client — it is **not** silently retried against the legacy backend,
  since a token rejected by HLX6 for a migrated org has no legacy fallback
  that makes sense (the org has moved).
- Ping failures never throw (see fail-safe above) — they only affect
  routing, not the tool's own success/failure.

## Known risk (explicitly unresolved by the spec)

The OpenAPI spec's `BearerToken` security scheme does not confirm whether
the **same DA/IMS bearer token** that MCP clients pass to da-mcp today is
valid for `api.aem.live` directly — it may have a different required
audience/scope than whatever `da-admin`'s service binding expects
internally. The design passes the token through unchanged and treats a
401/403 as a hard error. **This must be verified against a real HLX6
org/token before this ships** — flagged here rather than assumed to work.

## Testing

Following existing `test/mcp/handlers.test.ts` conventions (Vitest, mocked
`fetch`/service binding):

- `test/admin/detect.test.ts` — KV hit short-circuits ping; cache miss pings
  and caches only on positive result; negative result is never cached;
  ping errors resolve to `false` without throwing.
- `test/aem-admin/client.test.ts` — one test per method asserting exact
  URL, HTTP verb, headers, and body shape against the spec (e.g. copy uses
  `PUT .../{dest}?source={src}`, create uses raw body not FormData).
- `test/aem-admin/mappers.test.ts` — folder-listing, version-listing, and
  copy-response normalization into the shared `src/da-admin/types.ts`
  shapes.
- Extend `test/mcp/handlers.test.ts` to parametrize existing handler tests
  over `isHlx6` true/false (mocked), proving `handlers.ts` behavior and
  output shape is identical regardless of backend.
