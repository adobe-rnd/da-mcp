import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';

const isHlx6Mock = vi.hoisted(() => vi.fn());
vi.mock('../../src/admin/detect', () => ({ isHlx6: isHlx6Mock }));

const legacyMethods = {
  listSources: vi.fn().mockResolvedValue({
    sources: [], path: '', org: 'acme', repo: 'site1',
  }),
  getSource: vi.fn().mockResolvedValue('legacy-content'),
  createSource: vi.fn().mockResolvedValue({ success: true, path: 'legacy' }),
  updateSource: vi.fn().mockResolvedValue({ success: true, path: 'legacy' }),
  deleteSource: vi.fn().mockResolvedValue({ success: true, path: 'legacy' }),
  copyContent: vi.fn().mockResolvedValue({ success: true, path: 'legacy' }),
  moveContent: vi.fn().mockResolvedValue({ success: true, path: 'legacy' }),
  getVersions: vi.fn().mockResolvedValue({ versions: [] }),
  createVersion: vi.fn().mockResolvedValue({ success: true, path: 'legacy' }),
  getVersion: vi.fn().mockResolvedValue('legacy-version-content'),
  lookupMedia: vi.fn().mockResolvedValue({ data: '', mimeType: 'image/png' }),
  lookupFragment: vi.fn().mockResolvedValue({ path: 'legacy', url: '' }),
  uploadMedia: vi.fn().mockResolvedValue({ success: true, path: 'legacy' }),
  getFlags: vi.fn().mockResolvedValue({}),
};

const aemMethods = {
  listSources: vi.fn().mockResolvedValue({
    sources: [], path: '', org: 'acme', repo: 'site1',
  }),
  getSource: vi.fn().mockResolvedValue('aem-content'),
  createSource: vi.fn().mockResolvedValue({ success: true, path: 'aem' }),
  updateSource: vi.fn().mockResolvedValue({ success: true, path: 'aem' }),
  deleteSource: vi.fn().mockResolvedValue({ success: true, path: 'aem' }),
  copyContent: vi.fn().mockResolvedValue({ success: true, path: 'aem' }),
  moveContent: vi.fn().mockResolvedValue({ success: true, path: 'aem' }),
  getVersions: vi.fn().mockResolvedValue({ versions: [] }),
  createVersion: vi.fn().mockResolvedValue({ success: true, path: 'aem' }),
  getVersion: vi.fn().mockResolvedValue('aem-version-content'),
  lookupMedia: vi.fn().mockResolvedValue({ data: '', mimeType: 'image/png' }),
  lookupFragment: vi.fn().mockResolvedValue({ path: 'aem', url: '' }),
  uploadMedia: vi.fn().mockResolvedValue({ success: true, path: 'aem' }),
  getFlags: vi.fn().mockResolvedValue({}),
};

vi.mock('../../src/da-admin/client', () => ({
  DAAdminClient: vi.fn().mockImplementation(() => legacyMethods),
}));
vi.mock('../../src/aem-admin/client', () => ({
  AemAdminClient: vi.fn().mockImplementation(() => aemMethods),
}));

// Imported after the mocks so the mocked modules are in place.
// eslint-disable-next-line import/first
import { AdminClient } from '../../src/admin/admin-client';

describe('AdminClient', () => {
  let client: AdminClient;
  const kv = { get: vi.fn(), put: vi.fn() } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new AdminClient({
      apiToken: 'token', daadminService: {} as any, kv,
    });
  });

  const methodCalls: { method: keyof typeof legacyMethods; args: any[] }[] = [
    { method: 'listSources', args: ['acme', 'site1', 'docs'] },
    { method: 'getSource', args: ['acme', 'site1', 'docs/page.html'] },
    { method: 'createSource', args: ['acme', 'site1', 'docs/page.html', 'content', 'text/html'] },
    { method: 'updateSource', args: ['acme', 'site1', 'docs/page.html', 'content', 'text/html'] },
    { method: 'deleteSource', args: ['acme', 'site1', 'docs/page.html'] },
    { method: 'copyContent', args: ['acme', 'site1', 'docs/a.html', 'docs/b.html'] },
    { method: 'moveContent', args: ['acme', 'site1', 'docs/a.html', 'docs/b.html'] },
    { method: 'getVersions', args: ['acme', 'site1', 'docs/page.html'] },
    { method: 'createVersion', args: ['acme', 'site1', 'docs/page.html', 'Before redesign'] },
    { method: 'getVersion', args: ['acme', 'site1', 'docs/page.html', 'v1'] },
    { method: 'lookupMedia', args: ['acme', 'site1', 'media/image.png'] },
    { method: 'lookupFragment', args: ['acme', 'site1', 'fragments/footer.html'] },
    { method: 'uploadMedia', args: ['acme', 'site1', 'media/file.txt', 'base64', 'text/plain', 'file.txt'] },
  ];

  describe.each(methodCalls)('$method', ({ method, args }) => {
    it('delegates to the legacy client when isHlx6 resolves false', async () => {
      isHlx6Mock.mockResolvedValue(false);

      await (client as any)[method](...args);

      expect((legacyMethods as any)[method]).toHaveBeenCalledWith(...args);
      expect((aemMethods as any)[method]).not.toHaveBeenCalled();
    });

    it('delegates to the AEM client when isHlx6 resolves true', async () => {
      isHlx6Mock.mockResolvedValue(true);

      await (client as any)[method](...args);

      expect((aemMethods as any)[method]).toHaveBeenCalledWith(...args);
      expect((legacyMethods as any)[method]).not.toHaveBeenCalled();
    });
  });

  it('checks isHlx6 with the org, repo, and kv passed to the constructor', async () => {
    isHlx6Mock.mockResolvedValue(false);

    await client.getSource('acme', 'site1', 'docs/page.html');

    expect(isHlx6Mock).toHaveBeenCalledWith('acme', 'site1', kv, {
      pingBaseUrl: undefined,
    });
  });

  it('passes a custom hlxAdminBaseUrl through to isHlx6', async () => {
    isHlx6Mock.mockResolvedValue(false);
    const customClient = new AdminClient({
      apiToken: 'token',
      daadminService: {} as any,
      kv,
      hlxAdminBaseUrl: 'https://custom.example.com',
    });

    await customClient.getSource('acme', 'site1', 'docs/page.html');

    expect(isHlx6Mock).toHaveBeenCalledWith('acme', 'site1', kv, {
      pingBaseUrl: 'https://custom.example.com',
    });
  });
});

describe('AdminClient editUrl resolution', () => {
  let client: AdminClient;
  const kv = { get: vi.fn(), put: vi.fn() } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    legacyMethods.getFlags.mockResolvedValue({});
    aemMethods.getFlags.mockResolvedValue({});
    isHlx6Mock.mockResolvedValue(false);
    client = new AdminClient({
      apiToken: 'token', daadminService: {} as any, kv,
    });
  });

  it('always uses sheet# for a .json path, regardless of EW status', async () => {
    legacyMethods.getFlags.mockResolvedValue({ 'ew.enabled': 'true' });

    const result = await client.createSource('acme', 'site1', 'data/config.json', '{}', 'application/json');

    expect(result.editUrl).toBe('https://da.live/sheet#/acme/site1/data/config');
  });

  it('uses edit# when Experience Workspace is not enabled', async () => {
    const result = await client.createSource('acme', 'site1', 'docs/page.html', '<p>hi</p>');

    expect(result.editUrl).toBe('https://da.live/edit#/acme/site1/docs/page');
  });

  it('uses canvas# when the site-level ew.enabled flag is true', async () => {
    legacyMethods.getFlags.mockImplementation(async (org: string, repo?: string) => (
      repo ? { 'ew.enabled': 'true' } : {}
    ));

    const result = await client.updateSource('acme', 'site1', 'docs/page.html', '<p>hi</p>');

    expect(result.editUrl).toBe('https://da.live/canvas#/acme/site1/docs/page');
  });

  it('uses canvas# when only the org-level ew.enabled flag is true', async () => {
    legacyMethods.getFlags.mockImplementation(async (org: string, repo?: string) => (
      repo ? {} : { 'ew.enabled': 'true' }
    ));

    const result = await client.createSource('acme', 'site1', 'docs/page.html', '<p>hi</p>');

    expect(result.editUrl).toBe('https://da.live/canvas#/acme/site1/docs/page');
  });

  it('site-level flag overrides org-level flag', async () => {
    legacyMethods.getFlags.mockImplementation(async (org: string, repo?: string) => (
      repo ? { 'ew.enabled': 'false' } : { 'ew.enabled': 'true' }
    ));

    const result = await client.createSource('acme', 'site1', 'docs/page.html', '<p>hi</p>');

    expect(result.editUrl).toBe('https://da.live/edit#/acme/site1/docs/page');
  });

  it('fetches org-level flags via the legacy client even when the site is HLX6', async () => {
    isHlx6Mock.mockResolvedValue(true);
    aemMethods.getFlags.mockResolvedValue({ 'ew.enabled': 'true' });

    await client.createSource('acme', 'site1', 'docs/page.html', '<p>hi</p>');

    expect(legacyMethods.getFlags).toHaveBeenCalledWith('acme');
    expect(aemMethods.getFlags).toHaveBeenCalledWith('acme', 'site1');
  });

  it('uses canvas# when the HLX6 site-level flag is true', async () => {
    isHlx6Mock.mockResolvedValue(true);
    aemMethods.getFlags.mockImplementation(async (org: string, repo?: string) => (
      repo ? { 'ew.enabled': 'true' } : {}
    ));

    const result = await client.createSource('acme', 'site1', 'docs/page.html', '<p>hi</p>');

    expect(result.editUrl).toBe('https://da.live/canvas#/acme/site1/docs/page');
  });
});
