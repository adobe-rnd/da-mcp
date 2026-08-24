import {
  describe, it, expect,
} from 'vitest';
import {
  mapFolderListing,
  mapVersionListing,
  mapCopyResponse,
} from '../../src/aem-admin/mappers';

describe('mapFolderListing', () => {
  it('maps files and folders into DASource entries with computed paths', () => {
    const result = mapFolderListing(
      [
        {
          name: 'my-page.html', size: 12345, 'content-type': 'text/html', 'last-modified': '2021-05-29T21:00:00.000Z',
        },
        { name: 'my-subfolder/', 'content-type': 'application/folder' },
      ],
      'acme',
      'site1',
      'docs',
    );

    expect(result).toEqual({
      sources: [
        {
          name: 'my-page',
          path: 'docs/my-page.html',
          type: 'file',
          lastModified: '2021-05-29T21:00:00.000Z',
          size: 12345,
        },
        {
          name: 'my-subfolder',
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

  it('strips the extension from a file name but keeps the extension in the path', () => {
    const result = mapFolderListing(
      [{ name: 'admin-apikeys.html', 'content-type': 'text/html' }],
      'adobe',
      'aem-website',
      'docs',
    );

    expect(result.sources[0]).toMatchObject({ name: 'admin-apikeys', path: 'docs/admin-apikeys.html' });
  });

  it('strips only the trailing slash from a directory name but keeps it in the path', () => {
    const result = mapFolderListing(
      [{ name: 'assets/', 'content-type': 'application/folder' }],
      'adobe',
      'aem-website',
      'docs',
    );

    expect(result.sources[0]).toMatchObject({ name: 'assets', path: 'docs/assets/' });
  });

  it('preserves the full name (no extension) for a file with no extension', () => {
    const result = mapFolderListing(
      [{ name: 'README', 'content-type': 'text/plain' }],
      'acme',
      'site1',
      '',
    );

    expect(result.sources[0]).toMatchObject({ name: 'README', path: 'README' });
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
