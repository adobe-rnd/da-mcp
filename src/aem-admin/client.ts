/**
 * AEM (HLX6) Admin API Client
 * Talks directly to api.aem.live for org/repos that have been migrated
 * to HLX6, per the `source` tag of the AEM Admin API OpenAPI spec.
 */

import {
  DAAPIError,
  IAdminClient,
  DAListSourcesResponse,
  DASourceContent,
  DAVersionsResponse,
  DAMediaContent,
  DAMediaReference,
  DAOperationResponse,
} from '../da-admin/types';
import {
  AemAdminClientOptions,
  AemCopyResponse,
  AemFolderListingEntry,
  AemVersionListingEntry,
} from './types';
import { mapCopyResponse, mapFolderListing, mapVersionListing } from './mappers';

const DEFAULT_BASE_URL = 'https://api.aem.live';

export class AemAdminClient implements IAdminClient {
  private apiToken: string;

  private baseUrl: string;

  private timeout: number;

  constructor(options: AemAdminClientOptions) {
    this.apiToken = options.apiToken;
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.timeout = options.timeout || 30000;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { binary?: boolean } = {},
  ): Promise<T> {
    const { binary, ...requestOptions } = options;
    const headers = new Headers(requestOptions.headers || {});
    headers.set('Authorization', `Bearer ${this.apiToken}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...requestOptions,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error: DAAPIError = { status: response.status, message: response.statusText };
        try {
          const errorData: any = await response.json();
          error.details = errorData;
          error.message = errorData.message || error.message;
        } catch {
          // response body was not JSON, keep statusText
        }
        throw error;
      }

      const contentType = response.headers.get('content-type');

      if (binary) {
        const mimeType = (contentType || 'application/octet-stream').split(';')[0].trim();
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binaryStr = '';
        for (let i = 0; i < bytes.length; i += 1) {
          binaryStr += String.fromCharCode(bytes[i]);
        }
        return { data: btoa(binaryStr), mimeType } as unknown as T;
      }

      const body = await response.text();
      if (!body) {
        return {} as unknown as T;
      }
      if (contentType?.includes('application/json')) {
        return JSON.parse(body) as T;
      }
      return body as unknown as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error('Request timeout') as Error & DAAPIError;
        timeoutError.status = 408;
        throw timeoutError;
      }
      throw error;
    }
  }

  async listSources(
    org: string,
    repo: string,
    path: string = '',
  ): Promise<DAListSourcesResponse> {
    const endpoint = path
      ? `/${org}/sites/${repo}/source/${path}/`
      : `/${org}/sites/${repo}/source/`;
    const raw = await this.request<AemFolderListingEntry[]>(endpoint);
    return mapFolderListing(raw, org, repo, path);
  }

  async getSource(org: string, repo: string, path: string): Promise<DASourceContent> {
    const endpoint = `/${org}/sites/${repo}/source/${path}`;
    return this.request<DASourceContent>(endpoint);
  }

  async createSource(
    org: string,
    repo: string,
    path: string,
    content: string,
    contentType: string = 'text/html',
  ): Promise<DAOperationResponse> {
    const endpoint = `/${org}/sites/${repo}/source/${path}`;
    await this.request<unknown>(endpoint, {
      method: 'POST',
      body: content,
      headers: { 'Content-Type': contentType },
    });
    return { success: true, path };
  }

  async updateSource(
    org: string,
    repo: string,
    path: string,
    content: string,
    contentType: string = 'text/html',
  ): Promise<DAOperationResponse> {
    const endpoint = `/${org}/sites/${repo}/source/${path}`;
    await this.request<unknown>(endpoint, {
      method: 'PUT',
      body: content,
      headers: { 'Content-Type': contentType },
    });
    return { success: true, path };
  }

  async deleteSource(org: string, repo: string, path: string): Promise<DAOperationResponse> {
    const endpoint = `/${org}/sites/${repo}/source/${path}`;
    await this.request<unknown>(endpoint, { method: 'DELETE' });
    return { success: true, path };
  }

  async copyContent(
    org: string,
    repo: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<DAOperationResponse> {
    const source = encodeURIComponent(`/${sourcePath}`);
    const endpoint = `/${org}/sites/${repo}/source/${destinationPath}?source=${source}`;
    const raw = await this.request<AemCopyResponse>(endpoint, { method: 'PUT' });
    return mapCopyResponse(raw, destinationPath);
  }

  async moveContent(
    org: string,
    repo: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<DAOperationResponse> {
    const copyResult = await this.copyContent(org, repo, sourcePath, destinationPath);
    await this.deleteSource(org, repo, sourcePath);
    return copyResult;
  }

  async getVersions(org: string, repo: string, path: string): Promise<DAVersionsResponse> {
    const endpoint = `/${org}/sites/${repo}/source/${path}/.versions`;
    const raw = await this.request<AemVersionListingEntry[]>(endpoint);
    return mapVersionListing(raw);
  }

  async lookupMedia(org: string, repo: string, mediaPath: string): Promise<DAMediaContent> {
    const endpoint = `/${org}/sites/${repo}/source/${mediaPath}`;
    return this.request<DAMediaContent>(endpoint, { binary: true });
  }

  async lookupFragment(
    org: string,
    repo: string,
    fragmentPath: string,
  ): Promise<DAMediaReference> {
    // No fragment/include-resolution endpoint exists on api.aem.live per the
    // OpenAPI spec. Best-effort: fetch the raw document at that path.
    // This does NOT resolve nested fragment includes like legacy DA's
    // /fragment endpoint does — flagged in the design doc as needing
    // product/API-team confirmation before being treated as feature-complete.
    const endpoint = `/${org}/sites/${repo}/source/${fragmentPath}`;
    await this.request<string>(endpoint);
    return { path: fragmentPath, url: `${this.baseUrl}${endpoint}` };
  }

  async uploadMedia(
    org: string,
    repo: string,
    path: string,
    base64Data: string,
    mimeType: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _fileName: string,
  ): Promise<DAOperationResponse> {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i += 1) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const endpoint = `/${org}/sites/${repo}/source/${path}`;
    await this.request<unknown>(endpoint, {
      method: 'PUT',
      body: bytes,
      headers: { 'Content-Type': mimeType },
    });

    return { success: true, path };
  }
}
