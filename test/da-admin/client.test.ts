import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import { DAAdminClient } from '../../src/da-admin/client';

function createFakeDaadminService(response: Response) {
  return { fetch: vi.fn().mockResolvedValue(response) } as any;
}

describe('DAAdminClient', () => {
  it('createSource constructs its own editUrl but parses previewUrl/liveUrl from the real backend response', async () => {
    // Legacy admin.da.live's real response shape (docs.da.live/developers/api/source) is
    // { source: { editUrl, contentUrl }, aem: { previewUrl, liveUrl } }. We deliberately
    // ignore source.editUrl (constructing our own, consistent with HLX6 which has no
    // equivalent) but DO parse aem.previewUrl/liveUrl through, since legacy actually
    // provides them and there's no reason to discard real information.
    const daadminService = createFakeDaadminService(new Response(JSON.stringify({
      source: { editUrl: 'https://da.live/edit#/should-be-ignored', contentUrl: 'https://content.da.live/x' },
      aem: {
        previewUrl: 'https://main--site1--acme.aem.page/docs/new',
        liveUrl: 'https://main--site1--acme.aem.live/docs/new',
      },
    }), { status: 201, headers: { 'content-type': 'application/json' } }));
    const client = new DAAdminClient({ apiToken: 'token', daadminService });

    const result = await client.createSource('acme', 'site1', 'docs/new.html', '<p>hi</p>');

    expect(result).toEqual({
      success: true,
      path: 'docs/new.html',
      editUrl: 'https://da.live/edit#/acme/site1/docs/new',
      previewUrl: 'https://main--site1--acme.aem.page/docs/new',
      liveUrl: 'https://main--site1--acme.aem.live/docs/new',
    });
  });

  it('updateSource does the same', async () => {
    const daadminService = createFakeDaadminService(new Response(JSON.stringify({
      aem: {
        previewUrl: 'https://main--site1--acme.aem.page/docs/page',
        liveUrl: 'https://main--site1--acme.aem.live/docs/page',
      },
    }), { status: 201, headers: { 'content-type': 'application/json' } }));
    const client = new DAAdminClient({ apiToken: 'token', daadminService });

    const result = await client.updateSource('acme', 'site1', 'docs/page.html', '<p>updated</p>');

    expect(result).toEqual({
      success: true,
      path: 'docs/page.html',
      editUrl: 'https://da.live/edit#/acme/site1/docs/page',
      previewUrl: 'https://main--site1--acme.aem.page/docs/page',
      liveUrl: 'https://main--site1--acme.aem.live/docs/page',
    });
  });

  it('leaves previewUrl/liveUrl undefined when the backend response has no aem field', async () => {
    const daadminService = createFakeDaadminService(new Response('', { status: 201, headers: {} }));
    const client = new DAAdminClient({ apiToken: 'token', daadminService });

    const result = await client.createSource('acme', 'site1', 'docs/new.html', '<p>hi</p>');

    expect(result.previewUrl).toBeUndefined();
    expect(result.liveUrl).toBeUndefined();
  });
});

describe('DAAdminClient.createVersion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1700000000000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('passes the given label through unchanged', async () => {
    const daadminService = createFakeDaadminService(new Response('', { status: 201, headers: {} }));
    const client = new DAAdminClient({ apiToken: 'token', daadminService });

    await client.createVersion('acme', 'site1', 'docs/a.html', 'Before redesign');

    const request = daadminService.fetch.mock.calls[0][0] as Request;
    expect(await request.text()).toBe(JSON.stringify({ label: 'Before redesign' }));
  });

  it('defaults to a timestamp-based label when none is given, since admin.da.live rejects an empty body', async () => {
    const daadminService = createFakeDaadminService(new Response('', { status: 201, headers: {} }));
    const client = new DAAdminClient({ apiToken: 'token', daadminService });

    await client.createVersion('acme', 'site1', 'docs/a.html');

    const request = daadminService.fetch.mock.calls[0][0] as Request;
    expect(await request.text()).toBe(JSON.stringify({ label: 'Version 1700000000000' }));
  });
});

describe('DAAdminClient.getFlags', () => {
  it('extracts flags rows from a single-sheet config doc', async () => {
    const daadminService = createFakeDaadminService(new Response(JSON.stringify({
      ':type': 'sheet',
      ':sheetname': 'flags',
      data: [{ key: 'ew.enabled', value: 'true' }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const client = new DAAdminClient({ apiToken: 'token', daadminService });

    const flags = await client.getFlags('acme', 'site1');

    expect(daadminService.fetch.mock.calls[0][0].url).toBe('https://admin.da.live/config/acme/site1/');
    expect(flags).toEqual({ 'ew.enabled': 'true' });
  });

  it('extracts flags rows from a multi-sheet config doc', async () => {
    const daadminService = createFakeDaadminService(new Response(JSON.stringify({
      ':type': 'multi-sheet',
      ':names': ['flags', 'prompts'],
      flags: { data: [{ key: 'ew.enabled', value: 'false' }] },
      prompts: { data: [] },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const client = new DAAdminClient({ apiToken: 'token', daadminService });

    const flags = await client.getFlags('acme', 'site1');

    expect(flags).toEqual({ 'ew.enabled': 'false' });
  });

  it('fetches the org-level config when repo is omitted', async () => {
    const daadminService = createFakeDaadminService(new Response('', { status: 404, headers: {} }));
    const client = new DAAdminClient({ apiToken: 'token', daadminService });

    await client.getFlags('acme');

    expect(daadminService.fetch.mock.calls[0][0].url).toBe('https://admin.da.live/config/acme/');
  });

  it('returns an empty map when there is no flags sheet', async () => {
    const daadminService = createFakeDaadminService(new Response(JSON.stringify({
      ':type': 'sheet',
      ':sheetname': 'other',
      data: [{ key: 'x', value: 'y' }],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const client = new DAAdminClient({ apiToken: 'token', daadminService });

    const flags = await client.getFlags('acme', 'site1');

    expect(flags).toEqual({});
  });

  it('returns an empty map when the config does not exist (404)', async () => {
    const daadminService = createFakeDaadminService(new Response('', { status: 404, headers: {} }));
    const client = new DAAdminClient({ apiToken: 'token', daadminService });

    const flags = await client.getFlags('acme', 'site1');

    expect(flags).toEqual({});
  });

  it('does not log a noisy error block for the expected 404 (config-probe log noise)', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const daadminService = createFakeDaadminService(new Response('', { status: 404, headers: {} }));
    const client = new DAAdminClient({ apiToken: 'token', daadminService });

    await client.getFlags('acme', 'site1');

    const errorLines = logSpy.mock.calls.filter((call) => (
      call[0] === 'DA Admin API Error:' || call[0] === 'DA Admin API Request Failed:'
    ));
    expect(errorLines).toHaveLength(0);
    logSpy.mockRestore();
  });
});

describe('DAAdminClient preview/publish', () => {
  // admin.da.live has no preview/live routes of its own — these four operations go
  // straight to the Helix admin API (admin.hlx.page) via global fetch(), not through
  // the daadminService binding, so they're stubbed the same way as AemAdminClient's
  // tests rather than via createFakeDaadminService.
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: DAAdminClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    client = new DAAdminClient({
      apiToken: 'my-token',
      daadminService: createFakeDaadminService(new Response('', { status: 200, headers: {} })),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('previewContent POSTs to admin.hlx.page /preview/{org}/{repo}/main/{path} with x-content-source-authorization set to the same bearer value as Authorization, using the response body\'s own previewUrl and falling back to the computed liveUrl', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      preview: { status: 200, url: 'https://custom-branch--site1--acme.aem.page/docs/page' },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await client.previewContent('acme', 'site1', 'docs/page.html');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://admin.hlx.page/preview/acme/site1/main/docs/page.html');
    expect(init.method).toBe('POST');
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer my-token');
    expect(headers.get('x-content-source-authorization')).toBe('Bearer my-token');
    expect(result).toEqual({
      success: true,
      path: 'docs/page.html',
      previewUrl: 'https://custom-branch--site1--acme.aem.page/docs/page',
      liveUrl: 'https://main--site1--acme.aem.live/docs/page',
    });
  });

  it('unpreviewContent DELETEs admin.hlx.page /preview/{org}/{repo}/main/{path} without x-content-source-authorization', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204, headers: {} }));

    const result = await client.unpreviewContent('acme', 'site1', 'docs/page.html');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://admin.hlx.page/preview/acme/site1/main/docs/page.html');
    expect(init.method).toBe('DELETE');
    expect(new Headers(init.headers).get('x-content-source-authorization')).toBeNull();
    expect(result).toEqual({ success: true, path: 'docs/page.html' });
  });

  it('publishContent POSTs to admin.hlx.page /live/{org}/{repo}/main/{path} without x-content-source-authorization, using the response body\'s own liveUrl and falling back to the computed previewUrl', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      live: { status: 200, url: 'https://custom-branch--site1--acme.aem.live/docs/page' },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await client.publishContent('acme', 'site1', 'docs/page.html');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://admin.hlx.page/live/acme/site1/main/docs/page.html');
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('x-content-source-authorization')).toBeNull();
    expect(result).toEqual({
      success: true,
      path: 'docs/page.html',
      previewUrl: 'https://main--site1--acme.aem.page/docs/page',
      liveUrl: 'https://custom-branch--site1--acme.aem.live/docs/page',
    });
  });

  it('unpublishContent DELETEs admin.hlx.page /live/{org}/{repo}/main/{path} without x-content-source-authorization', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204, headers: {} }));

    const result = await client.unpublishContent('acme', 'site1', 'docs/page.html');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://admin.hlx.page/live/acme/site1/main/docs/page.html');
    expect(init.method).toBe('DELETE');
    expect(new Headers(init.headers).get('x-content-source-authorization')).toBeNull();
    expect(result).toEqual({ success: true, path: 'docs/page.html' });
  });

  it('surfaces the x-error response header on a non-ok response, without tagging the error as a da-admin failure', async () => {
    fetchMock.mockResolvedValue(new Response('', {
      status: 400,
      statusText: 'Bad Request',
      headers: { 'x-error': 'invalid path: docs/page.html' },
    }));

    expect.assertions(3);
    try {
      await client.previewContent('acme', 'site1', 'docs/page.html');
    } catch (error: any) {
      expect(error.status).toBe(400);
      expect(error.details).toEqual({ xError: 'invalid path: docs/page.html' });
      expect(error.backend).toBeUndefined();
    }
  });

  it('does not tag a timeout as a da-admin failure', async () => {
    fetchMock.mockImplementation(() => new Promise((_resolve, reject) => {
      reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }));
    }));

    expect.assertions(2);
    try {
      await client.publishContent('acme', 'site1', 'docs/page.html');
    } catch (error: any) {
      expect(error.status).toBe(408);
      expect(error.backend).toBeUndefined();
    }
  });
});
