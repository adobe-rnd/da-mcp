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
