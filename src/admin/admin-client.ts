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

  private async pickClient(org: string, repo: string): Promise<IAdminClient> {
    const hlx6 = await isHlx6(org, repo, this.kv, { pingBaseUrl: this.hlxAdminBaseUrl });
    return hlx6 ? this.aem : this.legacy;
  }

  async listSources(org: string, repo: string, path?: string): Promise<DAListSourcesResponse> {
    const client = await this.pickClient(org, repo);
    return client.listSources(org, repo, path as string);
  }

  async getSource(org: string, repo: string, path: string): Promise<DASourceContent> {
    const client = await this.pickClient(org, repo);
    return client.getSource(org, repo, path);
  }

  async createSource(
    org: string,
    repo: string,
    path: string,
    content: string,
    contentType?: string,
  ): Promise<DAOperationResponse> {
    const client = await this.pickClient(org, repo);
    return client.createSource(org, repo, path, content, contentType);
  }

  async updateSource(
    org: string,
    repo: string,
    path: string,
    content: string,
    contentType?: string,
  ): Promise<DAOperationResponse> {
    const client = await this.pickClient(org, repo);
    return client.updateSource(org, repo, path, content, contentType);
  }

  async deleteSource(org: string, repo: string, path: string): Promise<DAOperationResponse> {
    const client = await this.pickClient(org, repo);
    return client.deleteSource(org, repo, path);
  }

  async copyContent(
    org: string,
    repo: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<DAOperationResponse> {
    const client = await this.pickClient(org, repo);
    return client.copyContent(org, repo, sourcePath, destinationPath);
  }

  async moveContent(
    org: string,
    repo: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<DAOperationResponse> {
    const client = await this.pickClient(org, repo);
    return client.moveContent(org, repo, sourcePath, destinationPath);
  }

  async getVersions(org: string, repo: string, path: string): Promise<DAVersionsResponse> {
    const client = await this.pickClient(org, repo);
    return client.getVersions(org, repo, path);
  }

  async lookupMedia(org: string, repo: string, mediaPath: string): Promise<DAMediaContent> {
    const client = await this.pickClient(org, repo);
    return client.lookupMedia(org, repo, mediaPath);
  }

  async lookupFragment(
    org: string,
    repo: string,
    fragmentPath: string,
  ): Promise<DAMediaReference> {
    const client = await this.pickClient(org, repo);
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
    const client = await this.pickClient(org, repo);
    return client.uploadMedia(org, repo, path, base64Data, mimeType, fileName);
  }
}
