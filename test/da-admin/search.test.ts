import {
  describe, it, expect, vi,
} from 'vitest';
import { searchSources } from '../../src/da-admin/search';
import { IAdminClient } from '../../src/da-admin/types';

/**
 * Build a mock IAdminClient backed by an in-memory tree.
 * `tree` maps a relative directory path ('' is root) to its DASource children.
 * `contents` maps a file path to its content string for full-text tests.
 */
function makeClient(
  tree: Record<string, any[]>,
  contents: Record<string, string> = {},
): IAdminClient {
  return {
    listSources: vi.fn(async (_org: string, _repo: string, path = '') => {
      if (!(path in tree)) throw Object.assign(new Error('Not found'), { status: 404 });
      return {
        sources: tree[path], path, org: _org, repo: _repo,
      };
    }),
    getSource: vi.fn(async (_org: string, _repo: string, path: string) => ({
      path,
      content: contents[path] ?? '',
    })),
  } as unknown as IAdminClient;
}

const file = (name: string, lastModified?: string, size?: number) => ({
  name, path: `/${name}`, type: 'file', lastModified, size,
});
const dir = (name: string) => ({ name, path: `/${name}`, type: 'directory' });

describe('searchSources', () => {
  it('filters files by last-modified date range (inclusive of the whole end day)', async () => {
    const client = makeClient({
      '': [
        file('old.html', '2025-12-31T12:00:00.000Z'),
        file('inrange.html', '2026-01-15T09:00:00.000Z'),
        file('edge.html', '2026-01-31T23:30:00.000Z'),
        file('toonew.html', '2026-02-01T00:00:00.000Z'),
      ],
    });

    const result = await searchSources(client, {
      org: 'acme',
      repo: 'site',
      modifiedSince: '2026-01-01',
      modifiedUntil: '2026-01-31',
    });

    expect(result.matches.map((m) => m.name)).toEqual(['inrange.html', 'edge.html']);
  });

  it('excludes files with no lastModified when a date filter is set', async () => {
    const client = makeClient({
      '': [file('dated.html', '2026-01-10T00:00:00.000Z'), file('undated.html')],
    });

    const result = await searchSources(client, {
      org: 'acme', repo: 'site', modifiedSince: '2026-01-01',
    });

    expect(result.matches.map((m) => m.name)).toEqual(['dated.html']);
  });

  it('filters by extension and by name substring', async () => {
    const client = makeClient({
      '': [file('guide.html'), file('notes.md'), file('guide-old.html')],
    });

    const byExt = await searchSources(client, { org: 'a', repo: 's', ext: 'md' });
    expect(byExt.matches.map((m) => m.name)).toEqual(['notes.md']);

    const byName = await searchSources(client, { org: 'a', repo: 's', nameContains: 'guide' });
    expect(byName.matches.map((m) => m.name)).toEqual(['guide.html', 'guide-old.html']);
  });

  it('recurses into subdirectories up to maxDepth and reconstructs paths', async () => {
    const client = makeClient({
      '': [file('root.html'), dir('docs')],
      docs: [file('page.html'), dir('deep')],
      'docs/deep': [file('buried.html')],
    });

    const shallow = await searchSources(client, { org: 'a', repo: 's', maxDepth: 1 });
    expect(shallow.matches.map((m) => m.path)).toEqual(['root.html', 'docs/page.html']);

    const deep = await searchSources(client, { org: 'a', repo: 's', maxDepth: 5 });
    expect(deep.matches.map((m) => m.path)).toContain('docs/deep/buried.html');
  });

  it('matches content for full-text search and returns a snippet', async () => {
    const client = makeClient(
      { '': [file('a.html'), file('b.html')] },
      { 'a.html': '<p>Welcome to the checkout page</p>', 'b.html': '<p>About us</p>' },
    );

    const result = await searchSources(client, { org: 'a', repo: 's', text: 'checkout' });

    expect(result.matches.map((m) => m.name)).toEqual(['a.html']);
    expect(result.matches[0].snippet).toContain('checkout');
    expect(result.scanned.contentFetched).toBe(2);
  });

  it('is best-effort: a directory that fails to list is skipped, not fatal', async () => {
    const client = makeClient({
      '': [file('root.html'), dir('broken')],
      // 'broken' is intentionally absent from the tree, so listSources throws.
    });

    const result = await searchSources(client, { org: 'a', repo: 's' });

    expect(result.matches.map((m) => m.name)).toEqual(['root.html']);
  });

  it('caps results at maxResults and flags truncation', async () => {
    const client = makeClient({
      '': Array.from({ length: 5 }, (_, i) => file(`p${i}.html`)),
    });

    const result = await searchSources(client, { org: 'a', repo: 's', maxResults: 3 });

    expect(result.matches).toHaveLength(3);
    expect(result.truncated).toBe(true);
  });

  it('reports deferred capabilities (author, semantic) so callers know the gaps', async () => {
    const client = makeClient({ '': [file('a.html')] });
    const result = await searchSources(client, { org: 'a', repo: 's' });
    expect(result.deferred.join(' ')).toMatch(/author/i);
    expect(result.deferred.join(' ')).toMatch(/semantic/i);
  });
});
