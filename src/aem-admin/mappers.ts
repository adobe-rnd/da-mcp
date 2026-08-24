import {
  DASource, DAListSourcesResponse, DAVersion, DAVersionsResponse, DAOperationResponse,
} from '../da-admin/types';
import { AemFolderListingEntry, AemVersionListingEntry, AemCopyResponse } from './types';

/**
 * Derives the display name DA's own legacy /list endpoint uses:
 * directories drop their trailing slash, files drop their extension
 * (e.g. AEM's raw entry name 'assets/' -> 'assets', 'my-page.html' ->
 * 'my-page'). The full name (with slash/extension) is preserved in the
 * entry's `path`, unchanged.
 */
function toDisplayName(rawName: string, isDirectory: boolean): string {
  if (isDirectory) {
    return rawName.replace(/\/$/, '');
  }
  return rawName.replace(/\.[^./]+$/, '');
}

export function mapFolderListing(
  entries: AemFolderListingEntry[],
  org: string,
  repo: string,
  parentPath: string,
): DAListSourcesResponse {
  const sources: DASource[] = entries.map((entry) => {
    const isDirectory = entry['content-type'] === 'application/folder';
    return {
      name: toDisplayName(entry.name, isDirectory),
      path: parentPath ? `${parentPath}/${entry.name}` : entry.name,
      type: isDirectory ? 'directory' : 'file',
      lastModified: entry['last-modified'],
      size: entry.size,
    };
  });

  return {
    sources, path: parentPath, org, repo,
  };
}

export function mapVersionListing(entries: AemVersionListingEntry[]): DAVersionsResponse {
  const versions: DAVersion[] = entries.map((entry) => ({
    timestamp: entry['version-date'] ? new Date(entry['version-date']).getTime() : 0,
    path: entry['doc-path-hint'] || '',
    url: entry.version,
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
