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
  DAOperationResponse,
} from './types';

export class DAAdminClient {
  private apiToken: string;

  private daadminService: Fetcher;

  private timeout: number;

  constructor(options: DAAdminClientOptions) {
    this.apiToken = options.apiToken;
    this.daadminService = options.daadminService;
    this.timeout = options.timeout || 30000; // 30 seconds default
  }

  /**
   * Make an authenticated request to the DA Admin API via service binding
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const method = options.method || 'GET';

    console.log('DA Admin API Call (via service binding):');
    console.log('  Method:', method);
    console.log('  Endpoint:', endpoint);

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${this.apiToken}`);

    // Only set Content-Type for JSON, not for FormData
    const isFormData = options.body instanceof FormData;
    if (!isFormData) {
      headers.set('Content-Type', 'application/json');
    }

    if (options.body) {
      if (isFormData) {
        console.log('  Body: FormData (multipart/form-data)');
      } else {
        console.log('  Body:', options.body);
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const startTime = Date.now();

    try {
      // Create a Request object for the service binding
      const request = new Request(`https://daadmin${endpoint}`, {
        method,
        headers,
        body: options.body,
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

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      let result: T;

      if (contentType?.includes('application/json')) {
        result = await response.json();
        console.log('DA Admin API Result:', JSON.stringify(result, null, 2));
      } else {
        result = await response.text() as unknown as T;
        console.log('DA Admin API Result (text):', result);
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        console.log('DA Admin API Timeout after', this.timeout, 'ms');
        const timeoutError = new Error('Request timeout') as Error & DAAPIError;
        timeoutError.status = 408;
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

    return this.request<DAOperationResponse>(endpoint, {
      method: 'POST',
      body: formData,
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
    contentType?: string,
  ): Promise<DAOperationResponse> {
    const endpoint = `/source/${org}/${repo}/${path}`;

    // Create Blob with content
    const blob = new Blob([content], { type: contentType || 'text/html' });

    // Create FormData and append the blob
    const formData = new FormData();
    formData.append('data', blob);

    return this.request<DAOperationResponse>(endpoint, {
      method: 'POST',
      body: formData,
    });
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
    const endpoint = `/copy/${org}/${repo}`;
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
    destinationPath: string,
  ): Promise<DAOperationResponse> {
    const endpoint = `/move/${org}/${repo}`;
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
    path: string,
  ): Promise<DAVersionsResponse> {
    const endpoint = `/versions/${org}/${repo}/${path}`;
    return this.request<DAVersionsResponse>(endpoint);
  }

  /**
   * Get configuration
   */
  async getConfig(
    org: string,
    repo: string,
    configPath?: string,
  ): Promise<DAConfig> {
    const endpoint = `/config/${org}/${repo}${configPath ? `/${configPath}` : ''}`;
    return this.request<DAConfig>(endpoint);
  }

  /**
   * Update configuration
   */
  async updateConfig(
    org: string,
    repo: string,
    config: DAConfig,
    configPath?: string,
  ): Promise<DAOperationResponse> {
    const endpoint = `/config/${org}/${repo}${configPath ? `/${configPath}` : ''}`;
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
    mediaPath: string,
  ): Promise<DAMediaReference> {
    const endpoint = `/media/${org}/${repo}/${mediaPath}`;
    return this.request<DAMediaReference>(endpoint);
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
}
