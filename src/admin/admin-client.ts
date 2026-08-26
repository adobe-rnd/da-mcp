/**
 * AdminClient facade
 * Presents a single IAdminClient surface to the rest of da-mcp, routing
 * each call to the legacy DAAdminClient or the HLX6 AemAdminClient based
 * on isHlx6(org, repo).
 */

import { DAAdminClient } from '../da-admin/client';
import { AemAdminClient } from '../aem-admin/client';
import {
  DAListSourcesResponse,
  DASourceContent,
  DAVersionsResponse,
  DAMediaContent,
  DAMediaReference,
  DAOperationResponse,
  IAdminClient,
} from '../da-admin/types';
import { isHlx6 } from './detect';
import { buildDaUrl } from '../utils/path';

export interface AdminClientOptions {
  apiToken: string;
  daadminService: Fetcher;
  kv: KVNamespace;
  timeout?: number;
  hlxAdminBaseUrl?: string;
  aemApiBaseUrl?: string;
}

export class AdminClient implements IAdminClient {
  private legacy: DAAdminClient;

  private aem: AemAdminClient;

  private kv: KVNamespace;

  private hlxAdminBaseUrl?: string;

  constructor(options: AdminClientOptions) {
    this.legacy = new DAAdminClient({
      apiToken: options.apiToken,
      daadminService: options.daadminService,
      timeout: options.timeout,
    });
    this.aem = new AemAdminClient({
      apiToken: options.apiToken,
      baseUrl: options.aemApiBaseUrl,
      timeout: options.timeout,
    });
    this.kv = options.kv;
    this.hlxAdminBaseUrl = options.hlxAdminBaseUrl;
  }

  /**
   * Resolves the backend for a single call. Callers that also need the
   * EW-enabled check (createSource/updateSource) must reuse the returned
   * `hlx6` boolean rather than probing isHlx6 a second time — the ping is
   * a real network call for legacy (uncached) org/repos, and re-probing
   * doubled that portion of write latency and could theoretically
   * disagree with the first probe if a migration happened in between.
   */
  private async resolveClient(
    org: string,
    repo: string,
  ): Promise<{ client: IAdminClient; hlx6: boolean }> {
    const hlx6 = await isHlx6(org, repo, this.kv, { pingBaseUrl: this.hlxAdminBaseUrl });
    console.log(`AdminClient: routing ${org}/${repo} -> ${hlx6 ? 'AemAdminClient (api.aem.live)' : 'DAAdminClient (admin.da.live)'}`);
    return { client: hlx6 ? this.aem : this.legacy, hlx6 };
  }

  /**
   * Checks the org/site config's 'flags' sheet for `ew.enabled === 'true'`
   * (Experience Workspace), merging org-level and site-level flags with
   * site taking precedence — matching da-nx's own ewFlags.js convention.
   * Org-level flags always come from the legacy backend (there's no site
   * to probe HLX6 status with at the org level); site-level flags use the
   * `hlx6` result the caller already resolved via resolveClient(), not a
   * fresh probe. Not cached: this is a fresh config fetch on every call.
   */
  private async isExperienceWorkspaceEnabled(
    org: string,
    repo: string,
    hlx6: boolean,
  ): Promise<boolean> {
    const [orgFlags, siteFlags] = await Promise.all([
      this.legacy.getFlags(org),
      hlx6 ? this.aem.getFlags(org, repo) : this.legacy.getFlags(org, repo),
    ]);
    return { ...orgFlags, ...siteFlags }['ew.enabled'] === 'true';
  }

  /**
   * Resolves the da.live URL to return as editUrl for a create/update
   * result: .json paths always open in the sheet editor; otherwise the
   * Experience Workspace canvas editor if enabled for this org/repo,
   * falling back to the default document editor. Takes the already-
   * resolved `hlx6` boolean from resolveClient() rather than re-probing.
   */
  private async resolveAuthoringUrl(
    org: string,
    repo: string,
    path: string,
    hlx6: boolean,
  ): Promise<string> {
    if (path.toLowerCase().endsWith('.json')) {
      return buildDaUrl(org, repo, path, 'sheet');
    }
    const ewEnabled = await this.isExperienceWorkspaceEnabled(org, repo, hlx6);
    return buildDaUrl(org, repo, path, ewEnabled ? 'canvas' : 'edit');
  }

  /**
   * Overrides result.editUrl with the sheet#/canvas#-aware URL, but never
   * lets a failure here (e.g. a transient KV error inside isHlx6) fail the
   * whole call — the write itself has already succeeded by this point, so
   * on any error we just keep the underlying client's own plain edit# URL
   * instead of throwing.
   */
  private async withResolvedEditUrl(
    result: DAOperationResponse,
    org: string,
    repo: string,
    path: string,
    hlx6: boolean,
  ): Promise<DAOperationResponse> {
    try {
      return { ...result, editUrl: await this.resolveAuthoringUrl(org, repo, path, hlx6) };
    } catch (error) {
      console.log('AdminClient: resolveAuthoringUrl failed, keeping the default editUrl:', error);
      return result;
    }
  }

  async listSources(org: string, repo: string, path?: string): Promise<DAListSourcesResponse> {
    const { client } = await this.resolveClient(org, repo);
    return client.listSources(org, repo, path as string);
  }

  async getSource(org: string, repo: string, path: string): Promise<DASourceContent> {
    const { client } = await this.resolveClient(org, repo);
    return client.getSource(org, repo, path);
  }

  async createSource(
    org: string,
    repo: string,
    path: string,
    content: string,
    contentType?: string,
  ): Promise<DAOperationResponse> {
    const { client, hlx6 } = await this.resolveClient(org, repo);
    const result = await client.createSource(org, repo, path, content, contentType);
    return this.withResolvedEditUrl(result, org, repo, path, hlx6);
  }

  async updateSource(
    org: string,
    repo: string,
    path: string,
    content: string,
    contentType?: string,
  ): Promise<DAOperationResponse> {
    const { client, hlx6 } = await this.resolveClient(org, repo);
    const result = await client.updateSource(org, repo, path, content, contentType);
    return this.withResolvedEditUrl(result, org, repo, path, hlx6);
  }

  async deleteSource(org: string, repo: string, path: string): Promise<DAOperationResponse> {
    const { client } = await this.resolveClient(org, repo);
    return client.deleteSource(org, repo, path);
  }

  async copyContent(
    org: string,
    repo: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<DAOperationResponse> {
    const { client } = await this.resolveClient(org, repo);
    return client.copyContent(org, repo, sourcePath, destinationPath);
  }

  async moveContent(
    org: string,
    repo: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<DAOperationResponse> {
    const { client } = await this.resolveClient(org, repo);
    return client.moveContent(org, repo, sourcePath, destinationPath);
  }

  async getVersions(org: string, repo: string, path: string): Promise<DAVersionsResponse> {
    const { client } = await this.resolveClient(org, repo);
    return client.getVersions(org, repo, path);
  }

  async createVersion(
    org: string,
    repo: string,
    path: string,
    label?: string,
  ): Promise<DAOperationResponse> {
    const { client } = await this.resolveClient(org, repo);
    return client.createVersion(org, repo, path, label);
  }

  async getVersion(
    org: string,
    repo: string,
    path: string,
    versionId: string,
  ): Promise<DASourceContent> {
    const { client } = await this.resolveClient(org, repo);
    return client.getVersion(org, repo, path, versionId);
  }

  async lookupMedia(org: string, repo: string, mediaPath: string): Promise<DAMediaContent> {
    const { client } = await this.resolveClient(org, repo);
    return client.lookupMedia(org, repo, mediaPath);
  }

  async lookupFragment(
    org: string,
    repo: string,
    fragmentPath: string,
  ): Promise<DAMediaReference> {
    const { client } = await this.resolveClient(org, repo);
    return client.lookupFragment(org, repo, fragmentPath);
  }

  async uploadMedia(
    org: string,
    repo: string,
    path: string,
    base64Data: string,
    mimeType: string,
    fileName: string,
  ): Promise<DAOperationResponse> {
    const { client } = await this.resolveClient(org, repo);
    return client.uploadMedia(org, repo, path, base64Data, mimeType, fileName);
  }
}
