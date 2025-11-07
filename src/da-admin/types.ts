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
  version: string;
  timestamp: string;
  author?: string;
  message?: string;
}

export interface DAVersionsResponse {
  versions: DAVersion[];
  path: string;
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
  baseUrl?: string;
  timeout?: number;
}

export interface DAAPIError {
  status: number;
  message: string;
  details?: any;
}
