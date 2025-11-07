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
  DAConfig,
  DAMediaReference,
  DAFragmentReference,
  DAOperationResponse,
} from './types';

export class DAAdminClient {
  private apiToken: string;
  private baseUrl: string;
  private timeout: number;

  constructor(options: DAAdminClientOptions) {
    this.apiToken = options.apiToken;
    this.baseUrl = options.baseUrl || 'https://admin.da.live';
    this.timeout = options.timeout || 30000; // 30 seconds default
  }

  /**
   * Make an authenticated request to the DA Admin API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${this.apiToken}`);
    headers.set('Content-Type', 'application/json');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error: DAAPIError = {
          status: response.status,
          message: response.statusText,
        };

        try {
          const errorData: any = await response.json();
          error.details = errorData;
          error.message = errorData.message || error.message;
        } catch {
          // If response is not JSON, use statusText
        }

        throw error;
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      }

      return await response.text() as unknown as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw {
          status: 408,
          message: 'Request timeout',
        } as DAAPIError;
      }

      throw error;
    }
  }

  /**
   * List sources and directories in a DA repository
   */
  async listSources(
    org: string,
    repo: string,
    path: string = ''
  ): Promise<DAListSourcesResponse> {
    const endpoint = `/api/v1/source/${org}/${repo}${path ? `/${path}` : ''}`;
    return this.request<DAListSourcesResponse>(endpoint);
  }

  /**
   * Get source content
   */
  async getSource(
    org: string,
    repo: string,
    path: string
  ): Promise<DASourceContent> {
    const endpoint = `/api/v1/source/${org}/${repo}/${path}`;
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
    contentType?: string
  ): Promise<DAOperationResponse> {
    const endpoint = `/api/v1/source/${org}/${repo}/${path}`;
    return this.request<DAOperationResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ content, contentType }),
    });
  }

  /**
   * Update an existing source
   */
  async updateSource(
    org: string,
    repo: string,
    path: string,
    content: string,
    contentType?: string
  ): Promise<DAOperationResponse> {
    const endpoint = `/api/v1/source/${org}/${repo}/${path}`;
    return this.request<DAOperationResponse>(endpoint, {
      method: 'PUT',
      body: JSON.stringify({ content, contentType }),
    });
  }

  /**
   * Delete a source
   */
  async deleteSource(
    org: string,
    repo: string,
    path: string
  ): Promise<DAOperationResponse> {
    const endpoint = `/api/v1/source/${org}/${repo}/${path}`;
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
    destinationPath: string
  ): Promise<DAOperationResponse> {
    const endpoint = `/api/v1/copy/${org}/${repo}`;
    return this.request<DAOperationResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ sourcePath, destinationPath }),
    });
  }

  /**
   * Move content from one location to another
   */
  async moveContent(
    org: string,
    repo: string,
    sourcePath: string,
    destinationPath: string
  ): Promise<DAOperationResponse> {
    const endpoint = `/api/v1/move/${org}/${repo}`;
    return this.request<DAOperationResponse>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ sourcePath, destinationPath }),
    });
  }

  /**
   * Get version history for a source
   */
  async getVersions(
    org: string,
    repo: string,
    path: string
  ): Promise<DAVersionsResponse> {
    const endpoint = `/api/v1/versions/${org}/${repo}/${path}`;
    return this.request<DAVersionsResponse>(endpoint);
  }

  /**
   * Get configuration
   */
  async getConfig(
    org: string,
    repo: string,
    configPath?: string
  ): Promise<DAConfig> {
    const endpoint = `/api/v1/config/${org}/${repo}${configPath ? `/${configPath}` : ''}`;
    return this.request<DAConfig>(endpoint);
  }

  /**
   * Update configuration
   */
  async updateConfig(
    org: string,
    repo: string,
    config: DAConfig,
    configPath?: string
  ): Promise<DAOperationResponse> {
    const endpoint = `/api/v1/config/${org}/${repo}${configPath ? `/${configPath}` : ''}`;
    return this.request<DAOperationResponse>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  /**
   * Lookup media references
   */
  async lookupMedia(
    org: string,
    repo: string,
    mediaPath: string
  ): Promise<DAMediaReference> {
    const endpoint = `/api/v1/media/${org}/${repo}/${mediaPath}`;
    return this.request<DAMediaReference>(endpoint);
  }

  /**
   * Lookup fragment references
   */
  async lookupFragment(
    org: string,
    repo: string,
    fragmentPath: string
  ): Promise<DAFragmentReference> {
    const endpoint = `/api/v1/fragment/${org}/${repo}/${fragmentPath}`;
    return this.request<DAFragmentReference>(endpoint);
  }
}
