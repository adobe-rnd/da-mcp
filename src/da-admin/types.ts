/**
 * TypeScript types for DA Admin API
 */

export interface DASource {
  name: string;
  path: string;
  type: 'file' | 'directory';
  lastModified?: string;
  size?: number;
}

export interface DAListSourcesResponse {
  sources: DASource[];
  path: string;
  org: string;
  repo: string;
}

export interface DASourceContent {
  path: string;
  content: string;
  contentType?: string;
  lastModified?: string;
  etag?: string;
}

export interface DAVersion {
  timestamp: number;
  path: string;
  url?: string;
  users: {email: string}[];
}

export interface DAVersionsResponse {
  versions: DAVersion[];
}

export interface DAConfig {
  [key: string]: any;
}

export interface DAMediaReference {
  path: string;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface DAMediaContent {
  data: string; // base64-encoded binary data
  mimeType: string;
}

export interface DAFragmentReference {
  path: string;
  fragment: string;
  content?: string;
}

export interface DAOperationResponse {
  success: boolean;
  message?: string;
  path?: string;
  /**
   * DA editor URL for this document (https://da.live/edit#/{org}/{repo}/{path}),
   * constructed by createSource/updateSource on both backends — see
   * utils/path.ts buildEditUrl(). Not populated by other operations.
   */
  editUrl?: string;
  /**
   * AEM Edge Delivery preview/live URLs for this document. On the legacy
   * backend these are parsed from the real admin.da.live response
   * (aem.previewUrl / aem.liveUrl); on HLX6 (whose create/update responses
   * don't include them) they're computed with the same URL pattern — see
   * utils/path.ts buildAemUrls(). Not populated by other operations.
   */
  previewUrl?: string;
  liveUrl?: string;
}

export interface DAAdminClientOptions {
  apiToken: string;
  daadminService: Fetcher;
  timeout?: number;
}

export interface DAAPIError {
  status: number;
  message: string;
  details?: any;
  /**
   * Which admin backend produced this error. Set by DAAdminClient
   * ('da-admin') and AemAdminClient ('aem-admin') so formatError() in
   * src/mcp/handlers.ts can label the error correctly regardless of
   * which backend an org/repo was routed to.
   */
  backend?: 'da-admin' | 'aem-admin';
}

export interface IAdminClient {
  listSources(org: string, repo: string, path?: string): Promise<DAListSourcesResponse>;
  getSource(org: string, repo: string, path: string): Promise<DASourceContent>;
  createSource(
    org: string,
    repo: string,
    path: string,
    content: string,
    contentType?: string,
  ): Promise<DAOperationResponse>;
  updateSource(
    org: string,
    repo: string,
    path: string,
    content: string,
    contentType?: string,
  ): Promise<DAOperationResponse>;
  deleteSource(org: string, repo: string, path: string): Promise<DAOperationResponse>;
  copyContent(
    org: string,
    repo: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<DAOperationResponse>;
  moveContent(
    org: string,
    repo: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<DAOperationResponse>;
  getVersions(org: string, repo: string, path: string): Promise<DAVersionsResponse>;
  createVersion(
    org: string,
    repo: string,
    path: string,
    label?: string,
  ): Promise<DAOperationResponse>;
  /**
   * Retrieve the content of a specific version. `versionId` must be the
   * identifier returned in the `url` field of a prior getVersions() call —
   * its shape differs by backend (legacy: an opaque `/versionsource/...`
   * path; HLX6: a short version id) and is not something a caller should
   * construct manually.
   */
  getVersion(org: string, repo: string, path: string, versionId: string): Promise<DASourceContent>;
  lookupMedia(org: string, repo: string, mediaPath: string): Promise<DAMediaContent>;
  lookupFragment(org: string, repo: string, fragmentPath: string): Promise<DAMediaReference>;
  uploadMedia(
    org: string,
    repo: string,
    path: string,
    base64Data: string,
    mimeType: string,
    fileName: string,
  ): Promise<DAOperationResponse>;
}
