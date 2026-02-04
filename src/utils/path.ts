/**
 * Normalizes path parameters to prevent double slashes in API URLs.
 *
 * - Removes leading slash (prevents `/source/org/repo//path`)
 * - Removes trailing slash (for consistency)
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
  if (path === '') return '';

  let normalized = path;
  if (normalized.startsWith('/')) normalized = normalized.slice(1);
  if (normalized.endsWith('/')) normalized = normalized.slice(0, -1);

  return normalized;
}

/**
 * Ensures a path has the .html extension for DA source operations.
 * Adds .html if no extension present, preserves existing extensions.
 */
export function ensureHtmlExtension(path: string | undefined): string | undefined {
  if (path === undefined) return undefined;
  if (path === '') return '';

  const filename = path.split('/').pop() || '';
  return filename.includes('.') ? path : `${path}.html`;
}
