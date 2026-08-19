# HLX6 Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a parallel `api.aem.live` (HLX6) backend to da-mcp's DA Admin client layer, with per-org/repo detection, so all 11 MCP tools work correctly against both legacy (`admin.da.live`) and HLX6-migrated org/repos without any change to tool schemas or handler logic.

**Architecture:** A new `AemAdminClient` (direct `fetch()` to `https://api.aem.live`) sits alongside the existing `DAAdminClient` (service-binding call to `admin.da.live`). Both implement a shared `IAdminClient` interface. A new `AdminClient` facade in `src/admin/` checks `isHlx6(org, repo)` (KV-cached ping against `admin.hlx.page`) per call and delegates to whichever backend applies. `src/index.ts` constructs an `AdminClient` instead of a `DAAdminClient`; `src/mcp/handlers.ts` and `src/mcp/server.ts` only change their type annotation to `IAdminClient` — their logic is completely unaware of HLX6, by design.

**Tech Stack:** TypeScript, Cloudflare Workers (KV, Fetcher service binding, global `fetch`), Vitest, Zod (unaffected — tool schemas are unchanged).

**Spec:** `docs/superpowers/specs/2026-08-19-hlx6-support-design.md`

## Global Constraints

- Every da-mcp tool already requires both `org` and `repo` — no org-only detection edge case to handle (per spec's "HLX6 detection" section).
- HLX6 detection caches **only positive** results in KV, with a 7-day TTL (`expirationTtl: 604800`); negative results are never cached (spec: "HLX6 detection").
- Any ping failure (timeout/network/unexpected error) must resolve to `false` (legacy) and must never throw (spec: "Error handling" / fail-safe).
- `da_move_content` is the only tool requiring 2 calls to the HLX6 backend (copy then delete); every other tool is 1 call (spec: "Endpoint mapping" table).
- `da_lookup_fragment` has no HLX6 equivalent in the OpenAPI spec — implement as a best-effort plain `GET` on the fragment path, not real fragment/include resolution (spec: "Endpoint mapping" table, `da_lookup_fragment` row).
- HLX6 response shapes (`folderListing`, `versionListing`, `copyMoveEntry`) must be normalized into the existing shared types in `src/da-admin/types.ts` (`DASource`, `DAVersion`, `DAOperationResponse`) so tool output is unchanged regardless of backend (spec: "Response normalization").
- The known risk that the same bearer token may not be valid against `api.aem.live` is **not** to be silently worked around — a 401/403 from HLX6 must surface as a normal tool error, not fall back to legacy (spec: "Error handling", "Known risk").
- Note on spec's testing section: the spec suggested parametrizing `test/mcp/handlers.test.ts` over hlx6 true/false. Since `handlers.ts` never references `isHlx6` (the facade hides routing entirely), that parametrization is not meaningful at the handler level — this plan instead places that coverage in Task 5's `AdminClient` facade tests, which are the correct layer to prove routing behavior. `handlers.test.ts` itself needs no changes.

---

### Task 1: Shared `IAdminClient` interface

**Files:**
- Modify: `src/da-admin/types.ts` (add interface at end of file)
- Modify: `src/da-admin/client.ts:20` (class declaration)
- Modify: `src/mcp/handlers.ts` (type import + all 11 handler function signatures)
- Modify: `src/mcp/server.ts` (type import + `createServer` signature)

**Interfaces:**
- Produces: `IAdminClient` interface in `src/da-admin/types.ts`, with the exact method signatures matching `DAAdminClient`'s current public methods. All later tasks (`AemAdminClient`, `AdminClient`) implement this interface.

- [ ] **Step 1: Add the `IAdminClient` interface to `src/da-admin/types.ts`**

Append to the end of `src/da-admin/types.ts`:

```ts
export interface IAdminClient {
  listSources(org: string, repo: string, path?: string): Promise<DAListSourcesResponse>;
  getSource(org: string, repo: string, path: string): Promise<DASourceContent>;
  createSource(
    org: string,
    repo: string,
    path: string,
    content: string,
    contentType?: string,
  ): Promise<DAOperationResponse>;
  updateSource(
    org: string,
    repo: string,
    path: string,
    content: string,
    contentType?: string,
  ): Promise<DAOperationResponse>;
  deleteSource(org: string, repo: string, path: string): Promise<DAOperationResponse>;
  copyContent(
    org: string,
    repo: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<DAOperationResponse>;
  moveContent(
    org: string,
    repo: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<DAOperationResponse>;
  getVersions(org: string, repo: string, path: string): Promise<DAVersionsResponse>;
  lookupMedia(org: string, repo: string, mediaPath: string): Promise<DAMediaContent>;
  lookupFragment(org: string, repo: string, fragmentPath: string): Promise<DAMediaReference>;
  uploadMedia(
    org: string,
    repo: string,
    path: string,
    base64Data: string,
    mimeType: string,
    fileName: string,
  ): Promise<DAOperationResponse>;
}
```

- [ ] **Step 2: Make `DAAdminClient` implement the interface**

In `src/da-admin/client.ts`, update the imports and class declaration:

```ts
import {
  DAAdminClientOptions,
  DAAPIError,
  DAListSourcesResponse,
  DASourceContent,
  DAVersionsResponse,
  DAMediaContent,
  DAMediaReference,
  DAOperationResponse,
  IAdminClient,
} from './types';

export class DAAdminClient implements IAdminClient {
```

(No other changes to `client.ts` — its existing method signatures already match `IAdminClient` exactly.)

- [ ] **Step 3: Run type-check to confirm `DAAdminClient` satisfies the interface**

Run: `npm run type-check`
Expected: PASS with no errors (if there's a mismatch, TypeScript will report which method signature differs — fix `IAdminClient` or `client.ts` to match).

- [ ] **Step 4: Update `src/mcp/handlers.ts` to depend on the interface, not the concrete class**

Change the import:

```ts
import { DAAdminClient } from '../da-admin/client';
import { DAAPIError } from '../da-admin/types';
```

to:

```ts
import { DAAPIError, IAdminClient } from '../da-admin/types';
```

Then replace every handler function's `client: DAAdminClient` parameter type with `client: IAdminClient`. There are 11 occurrences, one per handler (`handleListSources`, `handleGetSource`, `handleCreateSource`, `handleUpdateSource`, `handleDeleteSource`, `handleCopyContent`, `handleMoveContent`, `handleGetVersions`, `handleLookupMedia`, `handleLookupFragment`, `handleUploadMedia`). Example for the first one:

```ts
export async function handleListSources(
  client: IAdminClient,
  args: { org: string; repo: string; path?: string },
) {
```

- [ ] **Step 5: Update `src/mcp/server.ts` to depend on the interface**

Change:

```ts
import { DAAdminClient } from '../da-admin/client';
```

to:

```ts
import { IAdminClient } from '../da-admin/types';
```

And change the `createServer` signature:

```ts
export function createServer(client: IAdminClient, version: string): McpServer {
```

- [ ] **Step 6: Run the full test suite and type-check to confirm no behavior changed**

Run: `npm run type-check && npm test`
Expected: All existing tests in `test/mcp/handlers.test.ts` and `test/utils/path.test.ts` PASS unchanged (they already pass a `mockClient: any`, which is unaffected by the type change), and type-check reports no errors.

- [ ] **Step 7: Lint and commit**

Run: `npm run lint`
Expected: no errors.

```bash
git add src/da-admin/types.ts src/da-admin/client.ts src/mcp/handlers.ts src/mcp/server.ts
git commit -m "refactor: introduce IAdminClient interface for backend-agnostic handlers"
```

---

### Task 2: HLX6 detection (`isHlx6`)

**Files:**
- Create: `src/admin/detect.ts`
- Test: `test/admin/detect.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `isHlx6(org: string, repo: string, kv: KVNamespace, options?: Hlx6DetectOptions): Promise<boolean>`, `Hlx6DetectOptions { pingBaseUrl?: string; ttlSeconds?: number }`, `DEFAULT_HLX_ADMIN_BASE_URL` and `DEFAULT_HLX6_CACHE_TTL_SECONDS` constants — consumed by Task 5's `AdminClient`.

- [ ] **Step 1: Write the failing tests**

Create `test/admin/detect.test.ts`:

```ts
import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import { isHlx6 } from '../../src/admin/detect';

function createFakeKv(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    store,
  };
}

describe('isHlx6', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true from cache without pinging', async () => {
    const kv = createFakeKv({ 'acme/site1': 'true' });

    const result = await isHlx6('acme', 'site1', kv as any);

    expect(result).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('pings and caches on positive detection', async () => {
    const kv = createFakeKv();
    fetchMock.mockResolvedValue(new Response('', {
      status: 200,
      headers: { 'x-api-upgrade-available': 'true' },
    }));

    const result = await isHlx6('acme', 'site2', kv as any);

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('https://admin.hlx.page/ping/acme/site2');
    expect(kv.put).toHaveBeenCalledWith('acme/site2', 'true', { expirationTtl: 604800 });
  });

  it('does not cache a negative result', async () => {
    const kv = createFakeKv();
    fetchMock.mockResolvedValue(new Response('', { status: 200, headers: {} }));

    const result = await isHlx6('acme', 'site3', kv as any);

    expect(result).toBe(false);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it('fails safe to false when the ping throws', async () => {
    const kv = createFakeKv();
    fetchMock.mockRejectedValue(new Error('network down'));

    const result = await isHlx6('acme', 'site4', kv as any);

    expect(result).toBe(false);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it('supports a custom ping base URL and TTL', async () => {
    const kv = createFakeKv();
    fetchMock.mockResolvedValue(new Response('', {
      status: 200,
      headers: { 'x-api-upgrade-available': '' },
    }));

    const result = await isHlx6('acme', 'site5', kv as any, {
      pingBaseUrl: 'https://custom.example.com',
      ttlSeconds: 60,
    });

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('https://custom.example.com/ping/acme/site5');
    expect(kv.put).toHaveBeenCalledWith('acme/site5', 'true', { expirationTtl: 60 });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run test/admin/detect.test.ts`
Expected: FAIL — `Cannot find module '../../src/admin/detect'`

- [ ] **Step 3: Implement `src/admin/detect.ts`**

```ts
/**
 * HLX6 detection
 * Determines whether a given org/repo has been migrated from the legacy
 * admin.hlx.page stack to the HLX6 api.aem.live stack, via a ping check
 * against the legacy admin host, cached in KV.
 */

export const DEFAULT_HLX_ADMIN_BASE_URL = 'https://admin.hlx.page';
export const DEFAULT_HLX6_CACHE_TTL_SECONDS = 604800; // 7 days

export interface Hlx6DetectOptions {
  pingBaseUrl?: string;
  ttlSeconds?: number;
}

/**
 * Checks (with caching) whether org/repo has been upgraded to HLX6.
 * Positive results are cached in KV for `ttlSeconds` (default 7 days).
 * Negative results are never cached, so a later migration is picked up
 * on the next call. Any ping failure fails safe to `false` (legacy).
 */
export async function isHlx6(
  org: string,
  repo: string,
  kv: KVNamespace,
  options: Hlx6DetectOptions = {},
): Promise<boolean> {
  const pingBaseUrl = options.pingBaseUrl || DEFAULT_HLX_ADMIN_BASE_URL;
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_HLX6_CACHE_TTL_SECONDS;
  const cacheKey = `${org}/${repo}`;

  const cached = await kv.get(cacheKey);
  if (cached === 'true') {
    return true;
  }

  try {
    const response = await fetch(`${pingBaseUrl}/ping/${org}/${repo}`);
    const upgraded = response.headers.get('x-api-upgrade-available') !== null;

    if (upgraded) {
      await kv.put(cacheKey, 'true', { expirationTtl: ttlSeconds });
    }

    return upgraded;
  } catch (error) {
    console.log('HLX6 ping failed, defaulting to legacy backend:', error);
    return false;
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run test/admin/detect.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Type-check, lint, commit**

Run: `npm run type-check && npm run lint`
Expected: no errors.

```bash
git add src/admin/detect.ts test/admin/detect.test.ts
git commit -m "feat: add HLX6 detection via cached ping"
```

---

### Task 3: HLX6 response types and mappers

**Files:**
- Create: `src/aem-admin/types.ts`
- Create: `src/aem-admin/mappers.ts`
- Test: `test/aem-admin/mappers.test.ts`

**Interfaces:**
- Consumes: `DASource`, `DAListSourcesResponse`, `DAVersion`, `DAVersionsResponse`, `DAOperationResponse` from `src/da-admin/types.ts` (already defined, unchanged).
- Produces: `AemFolderListingEntry`, `AemVersionListingEntry`, `AemCopyResponse` types; `mapFolderListing(entries, org, repo, parentPath)`, `mapVersionListing(entries)`, `mapCopyResponse(response, destinationPath)` functions — consumed by Task 4's `AemAdminClient`.

- [ ] **Step 1: Create `src/aem-admin/types.ts`**

```ts
/**
 * Raw response shapes returned by the HLX6 (api.aem.live) Admin API,
 * per the `source` tag of the AEM Admin API OpenAPI spec (v1.72.2).
 */

export interface AemFolderListingEntry {
  name: string;
  size?: number;
  'content-type'?: string;
  'last-modified'?: string;
}

export interface AemVersionListingEntry {
  version?: string;
  'doc-last-modified'?: string;
  'doc-path-hint'?: string;
  'doc-last-modified-by'?: string;
  'version-date'?: string;
  'version-by'?: string;
  'version-operation'?: string;
  'version-comment'?: string;
}

export interface AemCopyMoveEntry {
  src: string;
  dst: string;
}

export interface AemCopyResponse {
  copied?: AemCopyMoveEntry[];
}

export interface AemAdminClientOptions {
  apiToken: string;
  baseUrl?: string;
  timeout?: number;
}
```

- [ ] **Step 2: Write the failing tests for the mappers**

Create `test/aem-admin/mappers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  mapFolderListing, mapVersionListing, mapCopyResponse,
} from '../../src/aem-admin/mappers';

describe('mapFolderListing', () => {
  it('maps files and folders into DASource entries with computed paths', () => {
    const result = mapFolderListing(
      [
        { name: 'my-page.html', size: 12345, 'content-type': 'text/html', 'last-modified': '2021-05-29T21:00:00.000Z' },
        { name: 'my-subfolder/', 'content-type': 'application/folder' },
      ],
      'acme',
      'site1',
      'docs',
    );

    expect(result).toEqual({
      sources: [
        {
          name: 'my-page.html',
          path: 'docs/my-page.html',
          type: 'file',
          lastModified: '2021-05-29T21:00:00.000Z',
          size: 12345,
        },
        {
          name: 'my-subfolder/',
          path: 'docs/my-subfolder/',
          type: 'directory',
          lastModified: undefined,
          size: undefined,
        },
      ],
      path: 'docs',
      org: 'acme',
      repo: 'site1',
    });
  });

  it('computes root-level paths without a leading slash when parentPath is empty', () => {
    const result = mapFolderListing(
      [{ name: 'index.html', 'content-type': 'text/html' }],
      'acme',
      'site1',
      '',
    );

    expect(result.sources[0].path).toBe('index.html');
  });
});

describe('mapVersionListing', () => {
  it('maps version entries into DAVersion shape', () => {
    const result = mapVersionListing([
      {
        version: 'v1',
        'doc-path-hint': '/docs/page.html',
        'version-date': '2021-06-01T00:00:00.000Z',
        'version-by': 'user@example.com',
        'version-operation': 'preview',
      },
    ]);

    expect(result).toEqual({
      versions: [
        {
          timestamp: new Date('2021-06-01T00:00:00.000Z').getTime(),
          path: '/docs/page.html',
          users: [{ email: 'user@example.com' }],
        },
      ],
    });
  });

  it('handles entries missing optional fields', () => {
    const result = mapVersionListing([{}]);

    expect(result).toEqual({
      versions: [{ timestamp: 0, path: '', users: [] }],
    });
  });
});

describe('mapCopyResponse', () => {
  it('maps the first copied entry into a DAOperationResponse', () => {
    const result = mapCopyResponse(
      { copied: [{ src: '/a/source.html', dst: '/b/target.html' }] },
      'b/target.html',
    );

    expect(result).toEqual({ success: true, path: '/b/target.html' });
  });

  it('falls back to the requested destination path when copied is missing', () => {
    const result = mapCopyResponse({}, 'b/target.html');

    expect(result).toEqual({ success: true, path: 'b/target.html' });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run test/aem-admin/mappers.test.ts`
Expected: FAIL — `Cannot find module '../../src/aem-admin/mappers'`

- [ ] **Step 4: Implement `src/aem-admin/mappers.ts`**

```ts
import {
  DASource, DAListSourcesResponse, DAVersion, DAVersionsResponse, DAOperationResponse,
} from '../da-admin/types';
import { AemFolderListingEntry, AemVersionListingEntry, AemCopyResponse } from './types';

export function mapFolderListing(
  entries: AemFolderListingEntry[],
  org: string,
  repo: string,
  parentPath: string,
): DAListSourcesResponse {
  const sources: DASource[] = entries.map((entry) => ({
    name: entry.name,
    path: parentPath ? `${parentPath}/${entry.name}` : entry.name,
    type: entry['content-type'] === 'application/folder' ? 'directory' : 'file',
    lastModified: entry['last-modified'],
    size: entry.size,
  }));

  return {
    sources, path: parentPath, org, repo,
  };
}

export function mapVersionListing(entries: AemVersionListingEntry[]): DAVersionsResponse {
  const versions: DAVersion[] = entries.map((entry) => ({
    timestamp: entry['version-date'] ? new Date(entry['version-date']).getTime() : 0,
    path: entry['doc-path-hint'] || '',
    users: entry['version-by'] ? [{ email: entry['version-by'] }] : [],
  }));

  return { versions };
}

export function mapCopyResponse(
  response: AemCopyResponse,
  destinationPath: string,
): DAOperationResponse {
  const entry = response.copied?.[0];
  return {
    success: true,
    path: entry?.dst || destinationPath,
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run test/aem-admin/mappers.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Type-check, lint, commit**

Run: `npm run type-check && npm run lint`
Expected: no errors.

```bash
git add src/aem-admin/types.ts src/aem-admin/mappers.ts test/aem-admin/mappers.test.ts
git commit -m "feat: add HLX6 response types and normalization mappers"
```

---

### Task 4: `AemAdminClient`

**Files:**
- Create: `src/aem-admin/client.ts`
- Test: `test/aem-admin/client.test.ts`

**Interfaces:**
- Consumes: `IAdminClient` (Task 1), `AemAdminClientOptions`, `AemFolderListingEntry`, `AemVersionListingEntry`, `AemCopyResponse` (Task 3, `src/aem-admin/types.ts`), `mapFolderListing`, `mapVersionListing`, `mapCopyResponse` (Task 3, `src/aem-admin/mappers.ts`), `DAAPIError` (`src/da-admin/types.ts`, unchanged).
- Produces: `export class AemAdminClient implements IAdminClient` with a constructor `new AemAdminClient({ apiToken, baseUrl?, timeout? })`, defaulting `baseUrl` to `https://api.aem.live` — consumed by Task 5's `AdminClient`.

- [ ] **Step 1: Write the failing tests**

Create `test/aem-admin/client.test.ts`:

```ts
import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import { AemAdminClient } from '../../src/aem-admin/client';

describe('AemAdminClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: AemAdminClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    client = new AemAdminClient({ apiToken: 'test-token' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getSource performs a GET against the source endpoint with the bearer token', async () => {
    fetchMock.mockResolvedValue(new Response('<html></html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }));

    const result = await client.getSource('acme', 'site1', 'docs/page.html');

    expect(result).toBe('<html></html>');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.aem.live/acme/sites/site1/source/docs/page.html');
    expect(init.method ?? 'GET').toBe('GET');
    expect(init.headers.get('Authorization')).toBe('Bearer test-token');
  });

  it('listSources performs a GET with a trailing slash and maps the folder listing', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([
      { name: 'page.html', size: 10, 'content-type': 'text/html', 'last-modified': '2021-01-01T00:00:00.000Z' },
    ]), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await client.listSources('acme', 'site1', 'docs');

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.aem.live/acme/sites/site1/source/docs/');
    expect(result).toEqual({
      sources: [{
        name: 'page.html', path: 'docs/page.html', type: 'file', lastModified: '2021-01-01T00:00:00.000Z', size: 10,
      }],
      path: 'docs',
      org: 'acme',
      repo: 'site1',
    });
  });

  it('listSources on the root path requests a single trailing slash', async () => {
    fetchMock.mockResolvedValue(new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }));

    await client.listSources('acme', 'site1', '');

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.aem.live/acme/sites/site1/source/');
  });

  it('createSource POSTs the raw content with the given content type', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 201, headers: {} }));

    const result = await client.createSource('acme', 'site1', 'docs/new.html', '<p>hi</p>', 'text/html');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.aem.live/acme/sites/site1/source/docs/new.html');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('<p>hi</p>');
    expect(init.headers.get('Content-Type')).toBe('text/html');
    expect(result).toEqual({ success: true, path: 'docs/new.html' });
  });

  it('updateSource PUTs the raw content', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200, headers: {} }));

    await client.updateSource('acme', 'site1', 'docs/page.html', '<p>updated</p>', 'text/html');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.aem.live/acme/sites/site1/source/docs/page.html');
    expect(init.method).toBe('PUT');
    expect(init.body).toBe('<p>updated</p>');
  });

  it('deleteSource issues a DELETE', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 204, headers: {} }));

    const result = await client.deleteSource('acme', 'site1', 'docs/page.html');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.aem.live/acme/sites/site1/source/docs/page.html');
    expect(init.method).toBe('DELETE');
    expect(result).toEqual({ success: true, path: 'docs/page.html' });
  });

  it('copyContent PUTs to the destination with a source query parameter', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      copied: [{ src: '/docs/a.html', dst: '/docs/b.html' }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await client.copyContent('acme', 'site1', 'docs/a.html', 'docs/b.html');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.aem.live/acme/sites/site1/source/docs/b.html?source=%2Fdocs%2Fa.html');
    expect(init.method).toBe('PUT');
    expect(result).toEqual({ success: true, path: '/docs/b.html' });
  });

  it('moveContent copies then deletes the source (2 calls)', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ copied: [{ src: '/docs/a.html', dst: '/docs/b.html' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response('', { status: 204, headers: {} }));

    const result = await client.moveContent('acme', 'site1', 'docs/a.html', 'docs/b.html');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [copyUrl, copyInit] = fetchMock.mock.calls[0];
    expect(copyUrl).toBe('https://api.aem.live/acme/sites/site1/source/docs/b.html?source=%2Fdocs%2Fa.html');
    expect(copyInit.method).toBe('PUT');
    const [deleteUrl, deleteInit] = fetchMock.mock.calls[1];
    expect(deleteUrl).toBe('https://api.aem.live/acme/sites/site1/source/docs/a.html');
    expect(deleteInit.method).toBe('DELETE');
    expect(result).toEqual({ success: true, path: 'docs/b.html' });
  });

  it('getVersions GETs the .versions endpoint and maps entries', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([
      { 'version-date': '2021-01-01T00:00:00.000Z', 'doc-path-hint': '/docs/a.html', 'version-by': 'a@b.com' },
    ]), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await client.getVersions('acme', 'site1', 'docs/a.html');

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.aem.live/acme/sites/site1/source/docs/a.html/.versions');
    expect(result.versions).toHaveLength(1);
    expect(result.versions[0].path).toBe('/docs/a.html');
  });

  it('lookupMedia returns base64 data and mime type for binary content', async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { 'content-type': 'image/png' },
    }));

    const result = await client.lookupMedia('acme', 'site1', 'media/image.png');

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.aem.live/acme/sites/site1/source/media/image.png');
    expect(result.mimeType).toBe('image/png');
    expect(typeof result.data).toBe('string');
  });

  it('uploadMedia PUTs decoded binary content with the given mime type', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200, headers: {} }));
    const base64Data = btoa('hello');

    const result = await client.uploadMedia('acme', 'site1', 'media/file.txt', base64Data, 'text/plain', 'file.txt');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.aem.live/acme/sites/site1/source/media/file.txt');
    expect(init.method).toBe('PUT');
    expect(init.headers.get('Content-Type')).toBe('text/plain');
    expect(result).toEqual({ success: true, path: 'media/file.txt' });
  });

  it('lookupFragment falls back to a plain GET on the fragment path', async () => {
    fetchMock.mockResolvedValue(new Response('fragment content', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }));

    const result = await client.lookupFragment('acme', 'site1', 'fragments/footer.html');

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.aem.live/acme/sites/site1/source/fragments/footer.html');
    expect(result.path).toBe('fragments/footer.html');
  });

  it('throws a DAAPIError-shaped error on a non-ok response', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: 'not found' }), {
      status: 404,
      statusText: 'Not Found',
      headers: { 'content-type': 'application/json' },
    }));

    await expect(client.getSource('acme', 'site1', 'missing.html')).rejects.toMatchObject({
      status: 404,
      message: 'not found',
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run test/aem-admin/client.test.ts`
Expected: FAIL — `Cannot find module '../../src/aem-admin/client'`

- [ ] **Step 3: Implement `src/aem-admin/client.ts`**

```ts
/**
 * AEM (HLX6) Admin API Client
 * Talks directly to api.aem.live for org/repos that have been migrated
 * to HLX6, per the `source` tag of the AEM Admin API OpenAPI spec.
 */

import { DAAPIError, IAdminClient } from '../da-admin/types';
import {
  AemAdminClientOptions,
  AemCopyResponse,
  AemFolderListingEntry,
  AemVersionListingEntry,
} from './types';
import { mapCopyResponse, mapFolderListing, mapVersionListing } from './mappers';
import {
  DAListSourcesResponse,
  DASourceContent,
  DAVersionsResponse,
  DAMediaContent,
  DAMediaReference,
  DAOperationResponse,
} from '../da-admin/types';

const DEFAULT_BASE_URL = 'https://api.aem.live';

export class AemAdminClient implements IAdminClient {
  private apiToken: string;

  private baseUrl: string;

  private timeout: number;

  constructor(options: AemAdminClientOptions) {
    this.apiToken = options.apiToken;
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.timeout = options.timeout || 30000;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { binary?: boolean } = {},
  ): Promise<T> {
    const { binary, ...requestOptions } = options;
    const headers = new Headers(requestOptions.headers || {});
    headers.set('Authorization', `Bearer ${this.apiToken}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...requestOptions,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error: DAAPIError = { status: response.status, message: response.statusText };
        try {
          const errorData: any = await response.json();
          error.details = errorData;
          error.message = errorData.message || error.message;
        } catch {
          // response body was not JSON, keep statusText
        }
        throw error;
      }

      const contentType = response.headers.get('content-type');

      if (binary) {
        const mimeType = (contentType || 'application/octet-stream').split(';')[0].trim();
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binaryStr = '';
        for (let i = 0; i < bytes.length; i += 1) {
          binaryStr += String.fromCharCode(bytes[i]);
        }
        return { data: btoa(binaryStr), mimeType } as unknown as T;
      }

      const body = await response.text();
      if (!body) {
        return {} as unknown as T;
      }
      if (contentType?.includes('application/json')) {
        return JSON.parse(body) as T;
      }
      return body as unknown as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error('Request timeout') as Error & DAAPIError;
        timeoutError.status = 408;
        throw timeoutError;
      }
      throw error;
    }
  }

  async listSources(
    org: string,
    repo: string,
    path: string = '',
  ): Promise<DAListSourcesResponse> {
    const endpoint = path
      ? `/${org}/sites/${repo}/source/${path}/`
      : `/${org}/sites/${repo}/source/`;
    const raw = await this.request<AemFolderListingEntry[]>(endpoint);
    return mapFolderListing(raw, org, repo, path);
  }

  async getSource(org: string, repo: string, path: string): Promise<DASourceContent> {
    const endpoint = `/${org}/sites/${repo}/source/${path}`;
    return this.request<DASourceContent>(endpoint);
  }

  async createSource(
    org: string,
    repo: string,
    path: string,
    content: string,
    contentType: string = 'text/html',
  ): Promise<DAOperationResponse> {
    const endpoint = `/${org}/sites/${repo}/source/${path}`;
    await this.request<unknown>(endpoint, {
      method: 'POST',
      body: content,
      headers: { 'Content-Type': contentType },
    });
    return { success: true, path };
  }

  async updateSource(
    org: string,
    repo: string,
    path: string,
    content: string,
    contentType: string = 'text/html',
  ): Promise<DAOperationResponse> {
    const endpoint = `/${org}/sites/${repo}/source/${path}`;
    await this.request<unknown>(endpoint, {
      method: 'PUT',
      body: content,
      headers: { 'Content-Type': contentType },
    });
    return { success: true, path };
  }

  async deleteSource(org: string, repo: string, path: string): Promise<DAOperationResponse> {
    const endpoint = `/${org}/sites/${repo}/source/${path}`;
    await this.request<unknown>(endpoint, { method: 'DELETE' });
    return { success: true, path };
  }

  async copyContent(
    org: string,
    repo: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<DAOperationResponse> {
    const source = encodeURIComponent(`/${sourcePath}`);
    const endpoint = `/${org}/sites/${repo}/source/${destinationPath}?source=${source}`;
    const raw = await this.request<AemCopyResponse>(endpoint, { method: 'PUT' });
    return mapCopyResponse(raw, destinationPath);
  }

  async moveContent(
    org: string,
    repo: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<DAOperationResponse> {
    const copyResult = await this.copyContent(org, repo, sourcePath, destinationPath);
    await this.deleteSource(org, repo, sourcePath);
    return copyResult;
  }

  async getVersions(org: string, repo: string, path: string): Promise<DAVersionsResponse> {
    const endpoint = `/${org}/sites/${repo}/source/${path}/.versions`;
    const raw = await this.request<AemVersionListingEntry[]>(endpoint);
    return mapVersionListing(raw);
  }

  async lookupMedia(org: string, repo: string, mediaPath: string): Promise<DAMediaContent> {
    const endpoint = `/${org}/sites/${repo}/source/${mediaPath}`;
    return this.request<DAMediaContent>(endpoint, { binary: true });
  }

  async lookupFragment(
    org: string,
    repo: string,
    fragmentPath: string,
  ): Promise<DAMediaReference> {
    // No fragment/include-resolution endpoint exists on api.aem.live per the
    // OpenAPI spec. Best-effort: fetch the raw document at that path.
    // This does NOT resolve nested fragment includes like legacy DA's
    // /fragment endpoint does — flagged in the design doc as needing
    // product/API-team confirmation before being treated as feature-complete.
    const endpoint = `/${org}/sites/${repo}/source/${fragmentPath}`;
    await this.request<string>(endpoint);
    return { path: fragmentPath, url: `${this.baseUrl}${endpoint}` };
  }

  async uploadMedia(
    org: string,
    repo: string,
    path: string,
    base64Data: string,
    mimeType: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fileName: string,
  ): Promise<DAOperationResponse> {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i += 1) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const endpoint = `/${org}/sites/${repo}/source/${path}`;
    await this.request<unknown>(endpoint, {
      method: 'PUT',
      body: bytes,
      headers: { 'Content-Type': mimeType },
    });

    return { success: true, path };
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run test/aem-admin/client.test.ts`
Expected: PASS (13 tests)

- [ ] **Step 5: Type-check, lint, commit**

Run: `npm run type-check && npm run lint`
Expected: no errors. (If lint flags the unused-vars suppression differently, fix per the actual `@adobe/eslint-config-helix` rule name reported rather than guessing.)

```bash
git add src/aem-admin/client.ts test/aem-admin/client.test.ts
git commit -m "feat: add AemAdminClient for api.aem.live (HLX6)"
```

---

### Task 5: `AdminClient` facade

**Files:**
- Create: `src/admin/admin-client.ts`
- Test: `test/admin/admin-client.test.ts`

**Interfaces:**
- Consumes: `IAdminClient` (Task 1), `isHlx6` + `Hlx6DetectOptions` (Task 2, `src/admin/detect.ts`), `DAAdminClient` (`src/da-admin/client.ts`, unchanged), `AemAdminClient` (Task 4, `src/aem-admin/client.ts`).
- Produces: `export class AdminClient implements IAdminClient` with constructor `new AdminClient({ apiToken, daadminService, kv, timeout?, hlxAdminBaseUrl?, aemApiBaseUrl? })` — consumed by Task 6's `src/index.ts`.

- [ ] **Step 1: Write the failing tests**

Create `test/admin/admin-client.test.ts`:

```ts
import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';

const isHlx6Mock = vi.fn();
vi.mock('../../src/admin/detect', () => ({ isHlx6: isHlx6Mock }));

const legacyMethods = {
  listSources: vi.fn().mockResolvedValue({ sources: [], path: '', org: 'acme', repo: 'site1' }),
  getSource: vi.fn().mockResolvedValue('legacy-content'),
  createSource: vi.fn().mockResolvedValue({ success: true, path: 'legacy' }),
  updateSource: vi.fn().mockResolvedValue({ success: true, path: 'legacy' }),
  deleteSource: vi.fn().mockResolvedValue({ success: true, path: 'legacy' }),
  copyContent: vi.fn().mockResolvedValue({ success: true, path: 'legacy' }),
  moveContent: vi.fn().mockResolvedValue({ success: true, path: 'legacy' }),
  getVersions: vi.fn().mockResolvedValue({ versions: [] }),
  lookupMedia: vi.fn().mockResolvedValue({ data: '', mimeType: 'image/png' }),
  lookupFragment: vi.fn().mockResolvedValue({ path: 'legacy', url: '' }),
  uploadMedia: vi.fn().mockResolvedValue({ success: true, path: 'legacy' }),
};

const aemMethods = {
  listSources: vi.fn().mockResolvedValue({ sources: [], path: '', org: 'acme', repo: 'site1' }),
  getSource: vi.fn().mockResolvedValue('aem-content'),
  createSource: vi.fn().mockResolvedValue({ success: true, path: 'aem' }),
  updateSource: vi.fn().mockResolvedValue({ success: true, path: 'aem' }),
  deleteSource: vi.fn().mockResolvedValue({ success: true, path: 'aem' }),
  copyContent: vi.fn().mockResolvedValue({ success: true, path: 'aem' }),
  moveContent: vi.fn().mockResolvedValue({ success: true, path: 'aem' }),
  getVersions: vi.fn().mockResolvedValue({ versions: [] }),
  lookupMedia: vi.fn().mockResolvedValue({ data: '', mimeType: 'image/png' }),
  lookupFragment: vi.fn().mockResolvedValue({ path: 'aem', url: '' }),
  uploadMedia: vi.fn().mockResolvedValue({ success: true, path: 'aem' }),
};

vi.mock('../../src/da-admin/client', () => ({
  DAAdminClient: vi.fn().mockImplementation(() => legacyMethods),
}));
vi.mock('../../src/aem-admin/client', () => ({
  AemAdminClient: vi.fn().mockImplementation(() => aemMethods),
}));

// Imported after the mocks so the mocked modules are in place.
// eslint-disable-next-line import/first
import { AdminClient } from '../../src/admin/admin-client';

describe('AdminClient', () => {
  let client: AdminClient;
  const kv = { get: vi.fn(), put: vi.fn() } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new AdminClient({
      apiToken: 'token', daadminService: {} as any, kv,
    });
  });

  const methodCalls: { method: keyof typeof legacyMethods; args: any[] }[] = [
    { method: 'listSources', args: ['acme', 'site1', 'docs'] },
    { method: 'getSource', args: ['acme', 'site1', 'docs/page.html'] },
    { method: 'createSource', args: ['acme', 'site1', 'docs/page.html', 'content', 'text/html'] },
    { method: 'updateSource', args: ['acme', 'site1', 'docs/page.html', 'content', 'text/html'] },
    { method: 'deleteSource', args: ['acme', 'site1', 'docs/page.html'] },
    { method: 'copyContent', args: ['acme', 'site1', 'docs/a.html', 'docs/b.html'] },
    { method: 'moveContent', args: ['acme', 'site1', 'docs/a.html', 'docs/b.html'] },
    { method: 'getVersions', args: ['acme', 'site1', 'docs/page.html'] },
    { method: 'lookupMedia', args: ['acme', 'site1', 'media/image.png'] },
    { method: 'lookupFragment', args: ['acme', 'site1', 'fragments/footer.html'] },
    { method: 'uploadMedia', args: ['acme', 'site1', 'media/file.txt', 'base64', 'text/plain', 'file.txt'] },
  ];

  describe.each(methodCalls)('$method', ({ method, args }) => {
    it('delegates to the legacy client when isHlx6 resolves false', async () => {
      isHlx6Mock.mockResolvedValue(false);

      await (client as any)[method](...args);

      expect((legacyMethods as any)[method]).toHaveBeenCalledWith(...args);
      expect((aemMethods as any)[method]).not.toHaveBeenCalled();
    });

    it('delegates to the AEM client when isHlx6 resolves true', async () => {
      isHlx6Mock.mockResolvedValue(true);

      await (client as any)[method](...args);

      expect((aemMethods as any)[method]).toHaveBeenCalledWith(...args);
      expect((legacyMethods as any)[method]).not.toHaveBeenCalled();
    });
  });

  it('checks isHlx6 with the org, repo, and kv passed to the constructor', async () => {
    isHlx6Mock.mockResolvedValue(false);

    await client.getSource('acme', 'site1', 'docs/page.html');

    expect(isHlx6Mock).toHaveBeenCalledWith('acme', 'site1', kv, {
      pingBaseUrl: undefined,
    });
  });

  it('passes a custom hlxAdminBaseUrl through to isHlx6', async () => {
    isHlx6Mock.mockResolvedValue(false);
    const customClient = new AdminClient({
      apiToken: 'token',
      daadminService: {} as any,
      kv,
      hlxAdminBaseUrl: 'https://custom.example.com',
    });

    await customClient.getSource('acme', 'site1', 'docs/page.html');

    expect(isHlx6Mock).toHaveBeenCalledWith('acme', 'site1', kv, {
      pingBaseUrl: 'https://custom.example.com',
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run test/admin/admin-client.test.ts`
Expected: FAIL — `Cannot find module '../../src/admin/admin-client'`

- [ ] **Step 3: Implement `src/admin/admin-client.ts`**

```ts
/**
 * AdminClient facade
 * Presents a single IAdminClient surface to the rest of da-mcp, routing
 * each call to the legacy DAAdminClient or the HLX6 AemAdminClient based
 * on isHlx6(org, repo).
 */

import { DAAdminClient } from '../da-admin/client';
import { AemAdminClient } from '../aem-admin/client';
import {
  DAListSourcesResponse,
  DASourceContent,
  DAVersionsResponse,
  DAMediaContent,
  DAMediaReference,
  DAOperationResponse,
  IAdminClient,
} from '../da-admin/types';
import { isHlx6 } from './detect';

export interface AdminClientOptions {
  apiToken: string;
  daadminService: Fetcher;
  kv: KVNamespace;
  timeout?: number;
  hlxAdminBaseUrl?: string;
  aemApiBaseUrl?: string;
}

export class AdminClient implements IAdminClient {
  private legacy: DAAdminClient;

  private aem: AemAdminClient;

  private kv: KVNamespace;

  private hlxAdminBaseUrl?: string;

  constructor(options: AdminClientOptions) {
    this.legacy = new DAAdminClient({
      apiToken: options.apiToken,
      daadminService: options.daadminService,
      timeout: options.timeout,
    });
    this.aem = new AemAdminClient({
      apiToken: options.apiToken,
      baseUrl: options.aemApiBaseUrl,
      timeout: options.timeout,
    });
    this.kv = options.kv;
    this.hlxAdminBaseUrl = options.hlxAdminBaseUrl;
  }

  private async pickClient(org: string, repo: string): Promise<IAdminClient> {
    const hlx6 = await isHlx6(org, repo, this.kv, { pingBaseUrl: this.hlxAdminBaseUrl });
    return hlx6 ? this.aem : this.legacy;
  }

  async listSources(org: string, repo: string, path?: string): Promise<DAListSourcesResponse> {
    const client = await this.pickClient(org, repo);
    return client.listSources(org, repo, path as string);
  }

  async getSource(org: string, repo: string, path: string): Promise<DASourceContent> {
    const client = await this.pickClient(org, repo);
    return client.getSource(org, repo, path);
  }

  async createSource(
    org: string,
    repo: string,
    path: string,
    content: string,
    contentType?: string,
  ): Promise<DAOperationResponse> {
    const client = await this.pickClient(org, repo);
    return client.createSource(org, repo, path, content, contentType);
  }

  async updateSource(
    org: string,
    repo: string,
    path: string,
    content: string,
    contentType?: string,
  ): Promise<DAOperationResponse> {
    const client = await this.pickClient(org, repo);
    return client.updateSource(org, repo, path, content, contentType);
  }

  async deleteSource(org: string, repo: string, path: string): Promise<DAOperationResponse> {
    const client = await this.pickClient(org, repo);
    return client.deleteSource(org, repo, path);
  }

  async copyContent(
    org: string,
    repo: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<DAOperationResponse> {
    const client = await this.pickClient(org, repo);
    return client.copyContent(org, repo, sourcePath, destinationPath);
  }

  async moveContent(
    org: string,
    repo: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<DAOperationResponse> {
    const client = await this.pickClient(org, repo);
    return client.moveContent(org, repo, sourcePath, destinationPath);
  }

  async getVersions(org: string, repo: string, path: string): Promise<DAVersionsResponse> {
    const client = await this.pickClient(org, repo);
    return client.getVersions(org, repo, path);
  }

  async lookupMedia(org: string, repo: string, mediaPath: string): Promise<DAMediaContent> {
    const client = await this.pickClient(org, repo);
    return client.lookupMedia(org, repo, mediaPath);
  }

  async lookupFragment(
    org: string,
    repo: string,
    fragmentPath: string,
  ): Promise<DAMediaReference> {
    const client = await this.pickClient(org, repo);
    return client.lookupFragment(org, repo, fragmentPath);
  }

  async uploadMedia(
    org: string,
    repo: string,
    path: string,
    base64Data: string,
    mimeType: string,
    fileName: string,
  ): Promise<DAOperationResponse> {
    const client = await this.pickClient(org, repo);
    return client.uploadMedia(org, repo, path, base64Data, mimeType, fileName);
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run test/admin/admin-client.test.ts`
Expected: PASS (24 tests — 11 methods × 2 routing cases + 2 pass-through tests)

- [ ] **Step 5: Type-check, lint, commit**

Run: `npm run type-check && npm run lint`
Expected: no errors.

```bash
git add src/admin/admin-client.ts test/admin/admin-client.test.ts
git commit -m "feat: add AdminClient facade routing legacy vs HLX6 per org/repo"
```

---

### Task 6: Wire `AdminClient` into the Worker entry point and Cloudflare config

**Files:**
- Modify: `src/index.ts`
- Modify: `wrangler.toml`

**Interfaces:**
- Consumes: `AdminClient` + `AdminClientOptions` (Task 5, `src/admin/admin-client.ts`).
- Produces: nothing new — this is the final integration point; no other file depends on `index.ts`.

- [ ] **Step 1: Provision the KV namespaces**

Run these commands (they require Cloudflare account credentials already configured for `wrangler`):

```bash
npx wrangler kv namespace create HLX6_STATUS_KV
npx wrangler kv namespace create HLX6_STATUS_KV --env ci
npx wrangler kv namespace create HLX6_STATUS_KV --env production
```

Each command prints an `id` (and for the first, also update the base/dev config). Keep the three ids handy for Step 3.

- [ ] **Step 2: Update `src/index.ts`**

Change the imports and `Env` interface:

```ts
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { AdminClient } from './admin/admin-client';
import { createServer } from './mcp/server';

export interface Env {
  ENVIRONMENT?: string;
  VERSION?: string;
  DA_ADMIN_API_TOKEN?: string; // Optional fallback token for testing
  daadmin: Fetcher; // Service binding to DA Admin worker
  HLX6_STATUS_KV: KVNamespace; // Cache of org/repo -> HLX6-migrated status
  HLX_ADMIN_BASE_URL?: string; // Legacy admin host used for the HLX6 ping check
  AEM_API_BASE_URL?: string; // HLX6 admin host
}
```

Change the client construction inside the `fetch` handler:

```ts
    // Create fresh client + server per request to prevent cross-client data leaks
    const client = new AdminClient({
      apiToken: token,
      daadminService: env.daadmin,
      kv: env.HLX6_STATUS_KV,
      hlxAdminBaseUrl: env.HLX_ADMIN_BASE_URL,
      aemApiBaseUrl: env.AEM_API_BASE_URL,
    });
    const server = createServer(client, env.VERSION ?? 'unknown');
```

- [ ] **Step 3: Update `wrangler.toml`**

Add a top-level `kv_namespaces` block (paste the id from the first `wrangler kv namespace create` command in Step 1) right after the top-level `services` block:

```toml
services = [
  { binding = "daadmin", service = "da-admin-dev" }
]

kv_namespaces = [
  { binding = "HLX6_STATUS_KV", id = "<PASTE_ID_FROM_STEP_1_DEFAULT_COMMAND>" }
]
```

Add matching `kv_namespaces` blocks to `[env.ci]` and `[env.production]`, each with the id from its own `wrangler kv namespace create --env ...` command in Step 1:

```toml
# CI environment
[env.ci]
name = "da-mcp-ci"
services = [
  { binding = "daadmin", service = "da-admin-stage" }
]
kv_namespaces = [
  { binding = "HLX6_STATUS_KV", id = "<PASTE_ID_FROM_STEP_1_CI_COMMAND>" }
]

[env.ci.vars]
VERSION = "@@VERSION@@-ci"
ENVIRONMENT = "ci"

# Production environment
[env.production]
name = "da-mcp"
services = [
  { binding = "daadmin", service = "da-admin" }
]
kv_namespaces = [
  { binding = "HLX6_STATUS_KV", id = "<PASTE_ID_FROM_STEP_1_PRODUCTION_COMMAND>" }
]

[env.production.vars]
VERSION = "@@VERSION@@"
ENVIRONMENT = "production"
```

(`[env.local]` is unaffected — it does not redeclare `services` today and will likewise inherit the top-level `kv_namespaces` binding. `HLX_ADMIN_BASE_URL`/`AEM_API_BASE_URL` are left unset everywhere: `AdminClient`/`AemAdminClient`/`isHlx6` already default to the real `admin.hlx.page`/`api.aem.live` hosts when these vars are undefined, and there is no "local" variant of either external host to point to.)

- [ ] **Step 4: Type-check, run the full test suite, and lint**

Run: `npm run type-check && npm test && npm run lint`
Expected: all pass — this task changes no business logic, only wiring, so every existing test (`test/utils/path.test.ts`, `test/mcp/handlers.test.ts`, and every test added in Tasks 2-5) should already be green.

- [ ] **Step 5: Smoke-test locally**

Run: `npm run dev`
Then, in another terminal:

```bash
curl -s http://localhost:8787/health | jq .
```

Expected: `{"status":"healthy", ...}` — confirms the Worker still boots with the new `Env` shape and KV binding (wrangler's local dev mode creates a local KV store automatically, even before the real namespace exists remotely).

- [ ] **Step 6: Commit**

```bash
git add src/index.ts wrangler.toml
git commit -m "feat: wire AdminClient (HLX6-aware) into the Worker entry point"
```

---

## Self-Review Notes

- **Spec coverage:** every row of the spec's "Endpoint mapping" table has a corresponding method in `AemAdminClient` (Task 4); "HLX6 detection" is fully implemented in Task 2; "Response normalization" is implemented in Task 3; "Architecture / file layout" matches Tasks 1-6 file-for-file (with `detect.ts` under `src/admin/` per your requested change); "Config changes" is implemented in Task 6; "Error handling" (DAAPIError shape, no silent 401/403 fallback, fail-safe ping) is implemented in Tasks 2 and 4; the "Known risk" is called out again in Task 4's `lookupFragment`/general error-handling comments and is not silently papered over.
- **Deviation flagged:** the spec's suggestion to parametrize `test/mcp/handlers.test.ts` over hlx6 true/false is superseded by Task 5's `admin-client.test.ts`, which is the layer where routing actually happens — documented in Global Constraints so it isn't mistaken for a dropped requirement.
- **Type consistency:** `IAdminClient` (Task 1) method names/signatures are used verbatim and unchanged across `DAAdminClient` (Task 1), `AemAdminClient` (Task 4), and `AdminClient` (Task 5) — checked each signature side by side while writing Tasks 4 and 5.
