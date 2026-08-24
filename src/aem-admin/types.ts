/**
 * Raw response shapes returned by the HLX6 (api.aem.live) Admin API,
 * per the `source` tag of the AEM Admin API OpenAPI spec (v1.72.2).
 */

export interface AemFolderListingEntry {
  name: string;
  size?: number;
  'content-type'?: string;
  'last-modified'?: string;
}

export interface AemVersionListingEntry {
  version?: string;
  'doc-last-modified'?: string;
  'doc-path-hint'?: string;
  'doc-last-modified-by'?: string;
  'version-date'?: string;
  'version-by'?: string;
  'version-operation'?: string;
  'version-comment'?: string;
}

export interface AemCopyMoveEntry {
  src: string;
  dst: string;
}

export interface AemCopyResponse {
  copied?: AemCopyMoveEntry[];
}

export interface AemAdminClientOptions {
  apiToken: string;
  baseUrl?: string;
  timeout?: number;
}
