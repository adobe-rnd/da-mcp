/**
 * Advanced source search for DA repositories.
 *
 * The DA Admin API has no native search endpoint, so search is implemented
 * client-side: recursively list the tree via `listSources`, apply cheap
 * metadata filters (date range, extension, name) during traversal, and only
 * fetch file content via `getSource` for full-text matching on the surviving
 * candidates. Traversal and content fetches are budgeted so a large repository
 * can't exhaust the Worker's subrequest / CPU limits.
 */

import { DAListSourcesResponse, DASource, IAdminClient } from './types';

export interface SearchSourcesParams {
  org: string;
  repo: string;
  /** Path to scope the search to. Empty/undefined searches from the root. */
  path?: string;
  /** Only include files modified on or after this UTC date (YYYY-MM-DD). */
  modifiedSince?: string;
  /** Only include files modified on or before this UTC date (YYYY-MM-DD). */
  modifiedUntil?: string;
  /** Case-insensitive substring that must appear in the file's content. */
  text?: string;
  /** File extension to match, with or without the leading dot (e.g. "html"). */
  ext?: string;
  /** Case-insensitive substring the file name or path must contain. */
  nameContains?: string;
  /** How many directory levels below `path` to descend. Default 4. */
  maxDepth?: number;
  /** Maximum number of matches to return. Default 50. */
  maxResults?: number;
}

export interface SearchMatch {
  path: string;
  name: string;
  lastModified?: string;
  size?: number;
  /** A short excerpt around the first full-text hit, when `text` was given. */
  snippet?: string;
}

export interface SearchResult {
  matches: SearchMatch[];
  scanned: { directories: number; files: number; contentFetched: number };
  /** True when a budget cap stopped the search before the tree was exhausted. */
  truncated: boolean;
  /** True when the scope `path` itself does not exist (a 404 from the list API). */
  notFound?: boolean;
  /** Human-readable note, e.g. why a search returned nothing. */
  message?: string;
  deferred: string[];
}

const DEFERRED = [
  'author filter (creator/last modifier) — not in the list response; needs a per-file getVersions lookup',
  'semantic search — needs an embeddings index, tracked as the issue\'s bonus item',
];

const DEFAULT_MAX_DEPTH = 4;
const DEFAULT_MAX_RESULTS = 50;
// Caps on subrequests, well under the Cloudflare Workers per-request limit.
const MAX_DIR_SCAN = 200;
const MAX_TEXT_SCAN = 100;
const SNIPPET_RADIUS = 60;

/** Parse a YYYY-MM-DD UTC date to epoch millis, or NaN when absent/invalid. */
function parseSinceMs(date?: string): number {
  return date ? Date.parse(`${date}T00:00:00.000Z`) : NaN;
}

/** End-of-day (inclusive) epoch millis for a YYYY-MM-DD UTC date, or NaN. */
function parseUntilMs(date?: string): number {
  return date ? Date.parse(`${date}T23:59:59.999Z`) : NaN;
}

/** Cheap metadata filters that need no content fetch. */
function passesMetadataFilters(
  source: DASource,
  relPath: string,
  sinceMs: number,
  untilMs: number,
  ext?: string,
  nameContains?: string,
): boolean {
  if (ext) {
    const wanted = ext.startsWith('.') ? ext.slice(1) : ext;
    const actual = source.name.split('.').pop();
    if (!actual || actual.toLowerCase() !== wanted.toLowerCase()) return false;
  }

  if (nameContains) {
    const needle = nameContains.toLowerCase();
    if (!source.name.toLowerCase().includes(needle)
      && !relPath.toLowerCase().includes(needle)) return false;
  }

  if (!Number.isNaN(sinceMs) || !Number.isNaN(untilMs)) {
    const modifiedMs = source.lastModified ? Date.parse(source.lastModified) : NaN;
    // A date filter is a hard requirement: a file we can't date can't match it.
    if (Number.isNaN(modifiedMs)) return false;
    if (!Number.isNaN(sinceMs) && modifiedMs < sinceMs) return false;
    if (!Number.isNaN(untilMs) && modifiedMs > untilMs) return false;
  }

  return true;
}

/** Extract a short excerpt around the first case-insensitive hit. */
function buildSnippet(content: string, needle: string): string {
  const idx = content.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) return '';
  const start = Math.max(0, idx - SNIPPET_RADIUS);
  const end = Math.min(content.length, idx + needle.length + SNIPPET_RADIUS);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < content.length ? '…' : '';
  return `${prefix}${content.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`;
}

/**
 * Search a repository's sources by metadata and, optionally, content.
 * Best-effort: a directory that fails to list is skipped, not fatal.
 */
export async function searchSources(
  client: IAdminClient,
  params: SearchSourcesParams,
): Promise<SearchResult> {
  const { ext, nameContains } = params;
  const maxDepth = params.maxDepth ?? DEFAULT_MAX_DEPTH;
  const maxResults = params.maxResults ?? DEFAULT_MAX_RESULTS;
  const sinceMs = parseSinceMs(params.modifiedSince);
  const untilMs = parseUntilMs(params.modifiedUntil);

  const scanned = { directories: 0, files: 0, contentFetched: 0 };
  let truncated = false;

  // Breadth-first, one level at a time so a single depth cap is easy to reason
  // about and each level's directory listings run in parallel.
  const candidates: SearchMatch[] = [];
  const rootPath = params.path?.replace(/^\/+|\/+$/g, '') ?? '';
  type Dir = { relPath: string; depth: number };

  // Fold one directory listing into matched files (candidates) and the child
  // directories to descend into next.
  const collect = (listing: DAListSourcesResponse, dir: Dir, next: Dir[]) => {
    (listing.sources ?? []).forEach((source) => {
      const childPath = dir.relPath ? `${dir.relPath}/${source.name}` : source.name;
      if (source.type === 'directory') {
        if (dir.depth < maxDepth) next.push({ relPath: childPath, depth: dir.depth + 1 });
        return;
      }
      scanned.files += 1;
      const keep = passesMetadataFilters(source, childPath, sinceMs, untilMs, ext, nameContains);
      if (keep) {
        candidates.push({
          path: childPath,
          name: source.name,
          lastModified: source.lastModified,
          size: source.size,
        });
      }
    });
  };

  // Probe the scope path explicitly. A 404 here means the path doesn't exist —
  // a normal empty outcome for a search, not a tool error — so we return it as a
  // real result carrying the reason rather than throwing. Any other failure is a
  // genuine error and propagates (the handler surfaces the server status/code).
  let frontier: Dir[] = [];
  const root: Dir = { relPath: rootPath, depth: 0 };
  try {
    const rootListing = await client.listSources(params.org, params.repo, rootPath);
    scanned.directories += 1;
    collect(rootListing, root, frontier);
  } catch (error) {
    if ((error as { status?: number })?.status === 404) {
      return {
        matches: [],
        scanned,
        truncated: false,
        notFound: true,
        message: `Path not found: ${rootPath || '(root)'}`,
        deferred: DEFERRED,
      };
    }
    throw error;
  }

  /* eslint-disable no-await-in-loop -- BFS runs level-by-level to honor the scan budget */
  while (frontier.length > 0 && scanned.directories < MAX_DIR_SCAN) {
    const level = frontier.slice(0, MAX_DIR_SCAN - scanned.directories);
    if (level.length < frontier.length) truncated = true;

    // Best-effort below the root: a subdirectory that fails to list is skipped.
    const listings = await Promise.allSettled(
      level.map((dir) => client.listSources(params.org, params.repo, dir.relPath)),
    );
    scanned.directories += level.length;

    const nextFrontier: Dir[] = [];
    listings.forEach((listing, i) => {
      if (listing.status === 'fulfilled') collect(listing.value, level[i], nextFrontier);
    });
    frontier = nextFrontier;
  }
  if (frontier.length > 0) truncated = true;
  /* eslint-enable no-await-in-loop */

  let matches = candidates;
  if (params.text) {
    const needle = params.text;
    const toScan = candidates.slice(0, MAX_TEXT_SCAN);
    if (toScan.length < candidates.length) truncated = true;
    const scanned2 = await Promise.allSettled(
      toScan.map((c) => client.getSource(params.org, params.repo, c.path)),
    );
    scanned.contentFetched = toScan.length;
    matches = [];
    scanned2.forEach((res, i) => {
      if (res.status !== 'fulfilled') return;
      const content = res.value?.content ?? '';
      if (content.toLowerCase().includes(needle.toLowerCase())) {
        matches.push({ ...toScan[i], snippet: buildSnippet(content, needle) });
      }
    });
  }

  if (matches.length > maxResults) {
    truncated = true;
    matches = matches.slice(0, maxResults);
  }

  return {
    matches,
    scanned,
    truncated,
    notFound: false,
    deferred: DEFERRED,
  };
}
