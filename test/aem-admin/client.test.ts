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
      {
        name: 'page.html',
        size: 10,
        'content-type': 'text/html',
        'last-modified': '2021-01-01T00:00:00.000Z',
      },
    ]), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await client.listSources('acme', 'site1', 'docs');

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.aem.live/acme/sites/site1/source/docs/');
    expect(result).toEqual({
      sources: [
        {
          name: 'page.html',
          path: 'docs/page.html',
          type: 'file',
          lastModified: '2021-01-01T00:00:00.000Z',
          size: 10,
        },
      ],
      path: 'docs',
      org: 'acme',
      repo: 'site1',
    });
  });

  it('listSources on the root path requests a single trailing slash', async () => {
    fetchMock.mockResolvedValue(
      new Response('[]', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

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
    fetchMock.mockResolvedValue(new Response('', { status: 200, headers: {} }));

    const result = await client.deleteSource('acme', 'site1', 'docs/page.html');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.aem.live/acme/sites/site1/source/docs/page.html');
    expect(init.method).toBe('DELETE');
    expect(result).toEqual({ success: true, path: 'docs/page.html' });
  });

  it('copyContent PUTs to the destination with a source query parameter', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      copied: [
        {
          src: '/docs/a.html',
          dst: '/docs/b.html',
        },
      ],
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await client.copyContent('acme', 'site1', 'docs/a.html', 'docs/b.html');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.aem.live/acme/sites/site1/source/docs/b.html?source=%2Fdocs%2Fa.html');
    expect(init.method).toBe('PUT');
    expect(result).toEqual({ success: true, path: '/docs/b.html' });
  });

  it('moveContent copies then deletes the source (2 calls)', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            copied: [
              {
                src: '/docs/a.html',
                dst: '/docs/b.html',
              },
            ],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(new Response('', { status: 200, headers: {} }));

    const result = await client.moveContent('acme', 'site1', 'docs/a.html', 'docs/b.html');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [copyUrl, copyInit] = fetchMock.mock.calls[0];
    expect(copyUrl).toBe('https://api.aem.live/acme/sites/site1/source/docs/b.html?source=%2Fdocs%2Fa.html');
    expect(copyInit.method).toBe('PUT');
    const [deleteUrl, deleteInit] = fetchMock.mock.calls[1];
    expect(deleteUrl).toBe('https://api.aem.live/acme/sites/site1/source/docs/a.html');
    expect(deleteInit.method).toBe('DELETE');
    expect(result).toEqual({ success: true, path: '/docs/b.html' });
  });

  it('getVersions GETs the .versions endpoint and maps entries', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([
      {
        'version-date': '2021-01-01T00:00:00.000Z',
        'doc-path-hint': '/docs/a.html',
        'version-by': 'a@b.com',
      },
    ]), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await client.getVersions('acme', 'site1', 'docs/a.html');

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.aem.live/acme/sites/site1/source/docs/a.html/.versions');
    expect(result.versions).toHaveLength(1);
    expect(result.versions[0].path).toBe('/docs/a.html');
  });

  it('lookupMedia returns base64 data and mime type for binary content', async () => {
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      }),
    );

    const result = await client.lookupMedia('acme', 'site1', 'media/image.png');

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.aem.live/acme/sites/site1/source/media/image.png');
    expect(result.mimeType).toBe('image/png');
    expect(typeof result.data).toBe('string');
  });

  it('uploadMedia PUTs decoded binary content with the given mime type', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200, headers: {} }));
    const base64Data = btoa('hello');

    const result = await client.uploadMedia(
      'acme',
      'site1',
      'media/file.txt',
      base64Data,
      'text/plain',
      'file.txt',
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.aem.live/acme/sites/site1/source/media/file.txt');
    expect(init.method).toBe('PUT');
    expect(init.headers.get('Content-Type')).toBe('text/plain');
    expect(result).toEqual({ success: true, path: 'media/file.txt' });
  });

  it('lookupFragment falls back to a plain GET on the fragment path', async () => {
    fetchMock.mockResolvedValue(
      new Response('fragment content', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      }),
    );

    const result = await client.lookupFragment('acme', 'site1', 'fragments/footer.html');

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.aem.live/acme/sites/site1/source/fragments/footer.html');
    expect(result.path).toBe('fragments/footer.html');
  });

  it('throws a DAAPIError-shaped error on a non-ok response', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'not found' }), {
        status: 404,
        statusText: 'Not Found',
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(client.getSource('acme', 'site1', 'missing.html')).rejects.toMatchObject({
      status: 404,
      message: 'not found',
    });
  });

  it('surfaces the x-error response header on a non-ok response', async () => {
    fetchMock.mockResolvedValue(new Response('', {
      status: 400,
      statusText: 'Bad Request',
      headers: { 'x-error': 'invalid path: docs/new-page.html' },
    }));

    await expect(client.createSource('acme', 'site1', 'docs/new-page.html', '<p>hi</p>')).rejects.toMatchObject({
      status: 400,
      details: { xError: 'invalid path: docs/new-page.html' },
    });
  });
});
