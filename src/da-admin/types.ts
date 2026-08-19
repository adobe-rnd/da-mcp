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
