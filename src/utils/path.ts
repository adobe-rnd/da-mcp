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
