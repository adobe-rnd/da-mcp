/**
 * Normalizes path parameters to prevent double slashes in API URLs.
 *
 * - Trims whitespace
 * - Removes all leading slashes (prevents `/source/org/repo//path`)
 * - Removes all trailing slashes (for consistency)
 * - Preserves empty string (for root path)
 * - Preserves undefined (for optional parameters)
 *
 * @param path - The path to normalize
 * @returns Normalized path without leading/trailing slashes
 *
 * @example
 * normalizePath('/docs/file.md') // 'docs/file.md'
 * normalizePath('docs/file.md/') // 'docs/file.md'
 * normalizePath('/docs/') // 'docs'
 * normalizePath('docs') // 'docs'
 * normalizePath('/') // ''
 * normalizePath('') // ''
 * normalizePath(undefined) // undefined
 */
export function normalizePath(path: string | undefined): string | undefined {
  if (path === undefined) return undefined;
  const trimmed = path.trim();
  if (trimmed === '') return '';

  return trimmed.replace(/^\/+|\/+$/g, '');
}

/**
 * Normalizes a page path and ensures it has a .html extension for DA source operations.
 * Adds .html if the basename has no extension, preserves existing extensions.
 */
export function normalizePagePath(path: string | undefined): string | undefined {
  const normalized = normalizePath(path);
  if (normalized === undefined) return undefined;
  if (normalized === '') return '';

  const filename = normalized.split('/').pop() || '';
  const lastDot = filename.lastIndexOf('.');
  const hasExtension = lastDot > 0;

  return hasExtension ? normalized : `${normalized}.html`;
}

/**
 * Strips the extension from the filename portion of a path, preserving
 * any directory prefix (e.g. 'docs/page.html' -> 'docs/page'). Shared by
 * buildEditUrl and buildAemUrls, which both drop the extension from the
 * source path per DA/AEM's URL conventions.
 */
function stripFileExtension(path: string): string {
  const lastSlash = path.lastIndexOf('/');
  const dir = lastSlash >= 0 ? path.slice(0, lastSlash + 1) : '';
  const filename = lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
  const lastDot = filename.lastIndexOf('.');
  const nameWithoutExtension = lastDot > 0 ? filename.slice(0, lastDot) : filename;

  return `${dir}${nameWithoutExtension}`;
}

/**
 * Builds the DA editor URL for a source path, per DA's own convention
 * (the extension is dropped from the hash-route path). This is the same
 * editUrl legacy admin.da.live returns on its own /source create/update
 * responses (see docs.da.live/developers/api/source) — constructed
 * directly here so it's available consistently regardless of which
 * backend (legacy or HLX6) actually served the create/update request.
 *
 * @example
 * buildEditUrl('acme', 'site1', 'docs/page.html') // 'https://da.live/edit#/acme/site1/docs/page'
 */
export function buildEditUrl(org: string, repo: string, path: string): string {
  return `https://da.live/edit#/${org}/${repo}/${stripFileExtension(path)}`;
}

/**
 * Builds the AEM Edge Delivery preview/live URLs for a source path, per
 * the same 'main--{repo}--{org}.aem.{page|live}/{path}' convention
 * legacy admin.da.live's /source create/update response returns under
 * `aem.previewUrl`/`aem.liveUrl` (see docs.da.live/developers/api/source).
 * Computed directly here so HLX6 (whose create/update responses don't
 * include these) gets the same fields.
 *
 * @example
 * buildAemUrls('geometrixx', 'outdoors', 'test.html')
 * // { previewUrl: 'https://main--outdoors--geometrixx.aem.page/test',
 * //   liveUrl: 'https://main--outdoors--geometrixx.aem.live/test' }
 */
export function buildAemUrls(
  org: string,
  repo: string,
  path: string,
): { previewUrl: string; liveUrl: string } {
  const strippedPath = stripFileExtension(path);
  return {
    previewUrl: `https://main--${repo}--${org}.aem.page/${strippedPath}`,
    liveUrl: `https://main--${repo}--${org}.aem.live/${strippedPath}`,
  };
}
