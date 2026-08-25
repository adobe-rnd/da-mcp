/**
 * DA Admin API Client
 * Encapsulates all interactions with the Document Authoring Admin API
 */

import {
  DAAdminClientOptions,
  DAAPIError,
  DAListSourcesResponse,
  DASourceContent,
  DAVersionsResponse,
  DAMediaContent,
  DAMediaReference,
  DAOperationResponse,
  IAdminClient,
} from './types';
import { buildEditUrl } from '../utils/path';

interface DASourceResponse {
  aem?: { previewUrl?: string; liveUrl?: string };
}

export class DAAdminClient implements IAdminClient {
  private apiToken: string;

  private daadminService: Fetcher;

  private timeout: number;

  constructor(options: DAAdminClientOptions) {
    this.apiToken = options.apiToken;
    this.daadminService = options.daadminService;
    this.timeout = options.timeout || 30000; // 30 seconds default
  }

  /**
   * Make an authenticated request to the DA Admin API via service binding.
   * Pass `binary: true` to receive raw response bytes as base64 with MIME type.
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit & { binary?: boolean } = {},
  ): Promise<T> {
    const { binary, ...requestOptions } = options;
    const method = requestOptions.method || 'GET';

    console.log(`DA Admin API Call: Method: ${method} Endpoint: ${endpoint}`);

    const headers = new Headers(requestOptions.headers || {});
    headers.set('Authorization', `Bearer ${this.apiToken}`);

    // Mark writes as MCP-initiated so da-admin tags the version author as an agent.
    headers.set('x-da-initiator', 'mcp');

    // Only set Content-Type for non-FormData, non-binary requests
    const isFormData = requestOptions.body instanceof FormData;
    if (!binary && !isFormData) {
      headers.set('Content-Type', 'application/json');
    }

    if (requestOptions.body) {
      if (isFormData) {
        console.log('  Body: FormData (multipart/form-data)');
      } else {
        console.log('  Body:', requestOptions.body);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const startTime = Date.now();

    try {
      // Host must be the public da-admin origin (not a placeholder): da-admin
      // forwards req.url verbatim to da-collab's syncadmin invalidation, which keys
      // the Yjs room by the full URL string. A mismatched host invalidates a
      // phantom room and leaves live collab sessions stale. The service binding
      // routes by binding, so the host here only affects that propagated URL.
      //
      // NOTE: this hardcodes the PRODUCTION origin (admin.da.live). If we ever
      // deploy an environment that connects to stage (stage-admin.da.live), this
      // will invalidate the wrong collab room and must be fixed - e.g. thread the
      // env-specific base URL through DAAdminClient instead of hardcoding here.
      const request = new Request(`https://admin.da.live${endpoint}`, {
        ...requestOptions,
        headers,
        signal: controller.signal,
      });

      const response = await this.daadminService.fetch(request);

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      console.log('DA Admin API Response:', response.status, response.statusText, `(${duration}ms)`);

      if (!response.ok) {
        const error: DAAPIError = {
          status: response.status,
          message: response.statusText,
          backend: 'da-admin',
        };

        try {
          const errorData: any = await response.json();
          error.details = errorData;
          error.message = errorData.message || error.message;
          console.log('DA Admin API Error:', JSON.stringify(error, null, 2));
        } catch {
          // If response is not JSON, use statusText
          console.log('DA Admin API Error:', error.status, error.message);
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
        console.log('DA Admin API Timeout after', this.timeout, 'ms');
        const timeoutError = new Error('Request timeout') as Error & DAAPIError;
        timeoutError.status = 408;
        timeoutError.backend = 'da-admin';
        throw timeoutError;
      }

      console.log('DA Admin API Request Failed:', error);
      throw error;
    }
  }

  /**
   * List sources and directories in a DA repository
   */
  async listSources(
    org: string,
    repo: string,
    path: string = '',
  ): Promise<DAListSourcesResponse> {
    const endpoint = `/list/${org}/${repo}${path ? `/${path}` : ''}`;
    return this.request<DAListSourcesResponse>(endpoint);
  }

  /**
   * Get source content
   */
  async getSource(
    org: string,
    repo: string,
    path: string,
  ): Promise<DASourceContent> {
    const endpoint = `/source/${org}/${repo}/${path}`;
    return this.request<DASourceContent>(endpoint);
  }

  /**
   * Create a new source
   */
  async createSource(
    org: string,
    repo: string,
    path: string,
    content: string,
    contentType?: string,
  ): Promise<DAOperationResponse> {
    const endpoint = `/source/${org}/${repo}/${path}`;

    // Create Blob with content
    const blob = new Blob([content], { type: contentType || 'text/html' });

    // Create FormData and append the blob
    const formData = new FormData();
    formData.append('data', blob);

    const response = await this.request<DASourceResponse>(endpoint, {
      method: 'POST',
      body: formData,
    });
    return {
      success: true,
      path,
      editUrl: buildEditUrl(org, repo, path),
      previewUrl: response?.aem?.previewUrl,
      liveUrl: response?.aem?.liveUrl,
    };
  }

  /**
   * Update an existing source
   */
  async updateSource(
    org: string,
    repo: string,
    path: string,
    content: string,
    contentType?: string,
  ): Promise<DAOperationResponse> {
    const endpoint = `/source/${org}/${repo}/${path}`;

    // Create Blob with content
    const blob = new Blob([content], { type: contentType || 'text/html' });

    // Create FormData and append the blob
    const formData = new FormData();
    formData.append('data', blob);

    const response = await this.request<DASourceResponse>(endpoint, {
      method: 'POST',
      body: formData,
    });
    return {
      success: true,
      path,
      editUrl: buildEditUrl(org, repo, path),
      previewUrl: response?.aem?.previewUrl,
      liveUrl: response?.aem?.liveUrl,
    };
  }

  /**
   * Delete a source
   */
  async deleteSource(
    org: string,
    repo: string,
    path: string,
  ): Promise<DAOperationResponse> {
    const endpoint = `/source/${org}/${repo}/${path}`;
    return this.request<DAOperationResponse>(endpoint, {
      method: 'DELETE',
    });
  }

  /**
   * Copy content from one location to another
   */
  async copyContent(
    org: string,
    repo: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<DAOperationResponse> {
    const endpoint = `/copy/${org}/${repo}/${sourcePath}`;
    const formData = new FormData();
    formData.append('destination', `/${org}/${repo}/${destinationPath}`);
    return this.request<DAOperationResponse>(endpoint, {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Move content from one location to another
   */
  async moveContent(
    org: string,
    repo: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<DAOperationResponse> {
    const endpoint = `/move/${org}/${repo}/${sourcePath}`;
    const formData = new FormData();
    formData.append('destination', `/${org}/${repo}/${destinationPath}`);
    return this.request<DAOperationResponse>(endpoint, {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Get version history for a source
   */
  async getVersions(
    org: string,
    repo: string,
    path: string,
  ): Promise<DAVersionsResponse> {
    const endpoint = `/versionlist/${org}/${repo}/${path}`;
    return this.request<DAVersionsResponse>(endpoint);
  }

  /**
   * Lookup media — returns binary content as base64 with MIME type
   */
  async lookupMedia(
    org: string,
    repo: string,
    mediaPath: string,
  ): Promise<DAMediaContent> {
    const endpoint = `/source/${org}/${repo}/${mediaPath}`;
    return this.request<DAMediaContent>(endpoint, { binary: true });
  }

  /**
   * Lookup fragment references
   */
  async lookupFragment(
    org: string,
    repo: string,
    fragmentPath: string,
  ): Promise<DAMediaReference> {
    const endpoint = `/fragment/${org}/${repo}/${fragmentPath}`;
    return this.request<DAMediaReference>(endpoint);
  }

  /**
   * Upload media (images, files) to a DA repository
   * @param org Organization name
   * @param repo Repository name
   * @param path Destination path for the media file (e.g., "media/my-image.png")
   * @param base64Data Base64-encoded file content
   * @param mimeType MIME type of the file (e.g., "image/png", "image/jpeg")
   * @param fileName Original filename
   */
  async uploadMedia(
    org: string,
    repo: string,
    path: string,
    base64Data: string,
    mimeType: string,
    fileName: string,
  ): Promise<DAOperationResponse> {
    const endpoint = `/source/${org}/${repo}/${path}`;

    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i += 1) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create Blob with the correct MIME type
    const blob = new Blob([bytes], { type: mimeType });

    // Create FormData and append the blob with filename
    const formData = new FormData();
    formData.append('data', blob, fileName);

    return this.request<DAOperationResponse>(endpoint, {
      method: 'POST',
      body: formData,
    });
  }
}
