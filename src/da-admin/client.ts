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
import { buildEditUrl, buildAemUrls } from '../utils/path';
import { FlagRow, rowsToMap } from '../utils/flags';
import { DEFAULT_HLX_ADMIN_BASE_URL } from '../admin/detect';

interface DASourceResponse {
  aem?: { previewUrl?: string; liveUrl?: string };
}

interface DASheetConfig {
  ':type'?: 'sheet' | 'multi-sheet';
  ':sheetname'?: string;
  data?: FlagRow[];
  flags?: { data?: FlagRow[] };
}

function extractFlagsRows(raw: DASheetConfig): FlagRow[] {
  if (raw[':type'] === 'multi-sheet') return raw.flags?.data ?? [];
  if (raw[':type'] === 'sheet' && raw[':sheetname'] === 'flags') return raw.data ?? [];
  return [];
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
    options: RequestInit & { binary?: boolean; quiet404?: boolean } = {},
  ): Promise<T> {
    const { binary, quiet404, ...requestOptions } = options;
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

        const isQuiet404 = quiet404 && response.status === 404;
        try {
          const errorData: any = await response.json();
          error.details = errorData;
          error.message = errorData.message || error.message;
          if (!isQuiet404) {
            console.log('DA Admin API Error:', JSON.stringify(error, null, 2));
          }
        } catch {
          // If response is not JSON, use statusText
          if (!isQuiet404) {
            console.log('DA Admin API Error:', error.status, error.message);
          }
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

      const isQuiet404 = quiet404 && typeof error === 'object' && error !== null
        && (error as DAAPIError).status === 404;
      if (!isQuiet404) {
        console.log('DA Admin API Request Failed:', error);
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
   * Fetches the org/site config's 'flags' sheet as a plain key/value map
   * (e.g. used to check the 'ew.enabled' Experience Workspace flag). Not
   * part of IAdminClient — an internal capability, not an MCP tool.
   * Pass only `org` for the org-level config, or `org` + `repo` for the
   * site-level config. Returns {} if the config or the flags sheet
   * doesn't exist (a common, expected case, not an error).
   */
  async getFlags(org: string, repo?: string): Promise<Record<string, string>> {
    const endpoint = repo ? `/config/${org}/${repo}/` : `/config/${org}/`;
    try {
      // quiet404: most orgs won't have a flags config sheet at all, so a 404 here is
      // expected/common, not worth logging a full error block for on every create/update.
      const raw = await this.request<DASheetConfig>(endpoint, { quiet404: true });
      return rowsToMap(extractFlagsRows(raw));
    } catch {
      return {};
    }
  }

  /**
   * Create a snapshot version of the current file state.
   * See https://docs.da.live/developers/api/version
   */
  async createVersion(
    org: string,
    repo: string,
    path: string,
    label?: string,
  ): Promise<DAOperationResponse> {
    const endpoint = `/versionsource/${org}/${repo}/${path}`;
    // admin.da.live rejects a body-less request despite its docs describing the label as
    // optional (confirmed against a real instance) - default to a timestamp-based label
    // when the caller doesn't supply one. The exact text of an auto-generated label doesn't
    // matter, so a simple timestamp is enough; this default is legacy-only, HLX6 accepts
    // version creation with no comment at all.
    await this.request<unknown>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ label: label || `Version ${Date.now()}` }),
    });
    return { success: true, path };
  }

  /**
   * Retrieve the content of a specific version. `versionId` must be the
   * opaque `url` value returned by getVersions() for that version (e.g.
   * `/versionsource/{org}/{guid}/{guid}.html`) — it is already a full
   * endpoint path, not a bare identifier to be combined with org/repo/path.
   */
  async getVersion(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _org: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _repo: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _path: string,
    versionId: string,
  ): Promise<DASourceContent> {
    return this.request<DASourceContent>(versionId);
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

  /**
   * Make an authenticated request directly to the Helix admin API
   * (admin.hlx.page), for the one family of operations — preview/live —
   * that admin.da.live does not itself expose. Unlike request() this
   * calls global fetch() directly rather than going through the
   * daadminService binding, since admin.hlx.page is a plain external
   * host, not the da-admin worker. Structurally mirrors AemAdminClient's
   * request(), which talks to its own external host the same way.
   */
  private async requestHlx<T>(
    endpoint: string,
    options: RequestInit & { headers?: Record<string, string> } = {},
  ): Promise<T> {
    const method = options.method || 'GET';
    console.log(`Helix Admin API Call: Method: ${method} Endpoint: ${endpoint}`);

    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${this.apiToken}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const startTime = Date.now();

    try {
      const response = await fetch(`${DEFAULT_HLX_ADMIN_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      console.log('Helix Admin API Response:', response.status, response.statusText, `(${duration}ms)`);

      if (!response.ok) {
        const error: DAAPIError = { status: response.status, message: response.statusText, backend: 'da-admin' };
        try {
          const errorData: any = await response.json();
          error.details = errorData;
          error.message = errorData.message || error.message;
        } catch {
          // response body was not JSON, keep statusText
        }
        console.log('Helix Admin API Error:', JSON.stringify(error, null, 2));
        throw error;
      }

      const contentType = response.headers.get('content-type');
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
        console.log('Helix Admin API Timeout after', this.timeout, 'ms');
        const timeoutError = new Error('Request timeout') as Error & DAAPIError;
        timeoutError.status = 408;
        timeoutError.backend = 'da-admin';
        throw timeoutError;
      }
      console.log('Helix Admin API Request Failed:', error);
      throw error;
    }
  }

  /**
   * Preview (create/update) a document. admin.da.live has no preview/live
   * routes of its own — these go straight to the Helix admin API
   * (admin.hlx.page), via requestHlx() above, always targeting the `main`
   * ref (DA org/repos map 1:1 to a single hlx site/branch).
   *
   * Sends x-content-source-authorization alongside Authorization: this
   * preview call fetches/renders content from the source, which Helix
   * requires a content-source credential for. The other three operations
   * here don't fetch content, so they don't need it.
   */
  async previewContent(org: string, repo: string, path: string): Promise<DAOperationResponse> {
    const endpoint = `/preview/${org}/${repo}/main/${path}`;
    await this.requestHlx<unknown>(endpoint, {
      method: 'POST',
      headers: { 'x-content-source-authorization': `Bearer ${this.apiToken}` },
    });
    return { success: true, path, ...buildAemUrls(org, repo, path) };
  }

  /**
   * Remove a document's preview.
   */
  async unpreviewContent(org: string, repo: string, path: string): Promise<DAOperationResponse> {
    const endpoint = `/preview/${org}/${repo}/main/${path}`;
    await this.requestHlx<unknown>(endpoint, { method: 'DELETE' });
    return { success: true, path };
  }

  /**
   * Publish a document to live.
   */
  async publishContent(org: string, repo: string, path: string): Promise<DAOperationResponse> {
    const endpoint = `/live/${org}/${repo}/main/${path}`;
    await this.requestHlx<unknown>(endpoint, { method: 'POST' });
    return { success: true, path, ...buildAemUrls(org, repo, path) };
  }

  /**
   * Remove a document from live (unpublish).
   */
  async unpublishContent(org: string, repo: string, path: string): Promise<DAOperationResponse> {
    const endpoint = `/live/${org}/${repo}/main/${path}`;
    await this.requestHlx<unknown>(endpoint, { method: 'DELETE' });
    return { success: true, path };
  }
}
