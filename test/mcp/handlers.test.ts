import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import {
  handleListSources,
  handleGetSource,
  handleCreateSource,
  handleUpdateSource,
  handleDeleteSource,
  handleCopyContent,
  handleMoveContent,
  handleGetVersions,
  handleLookupMedia,
  handleLookupFragment,
  handleUploadMedia,
} from '../../src/mcp/handlers';

// Mock the DA Admin Client
vi.mock('../../src/da-admin/client');

describe('Handler path normalization', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      listSources: vi.fn().mockResolvedValue({ sources: [] }),
      getSource: vi.fn().mockResolvedValue({ content: '' }),
      createSource: vi.fn().mockResolvedValue({ success: true }),
      updateSource: vi.fn().mockResolvedValue({ success: true }),
      deleteSource: vi.fn().mockResolvedValue({ success: true }),
      copyContent: vi.fn().mockResolvedValue({ success: true }),
      moveContent: vi.fn().mockResolvedValue({ success: true }),
      getVersions: vi.fn().mockResolvedValue({ versions: [] }),
      lookupMedia: vi.fn().mockResolvedValue({ data: 'base64imagedata', mimeType: 'image/png' }),
      lookupFragment: vi.fn().mockResolvedValue({ url: '' }),
      uploadMedia: vi.fn().mockResolvedValue({ success: true }),
    };
  });

  describe('handleListSources', () => {
    it('should normalize path with leading slash', async () => {
      await handleListSources(mockClient, { org: 'test', repo: 'repo', path: '/docs' });
      expect(mockClient.listSources).toHaveBeenCalledWith('test', 'repo', 'docs');
    });

    it('should normalize path with trailing slash', async () => {
      await handleListSources(mockClient, { org: 'test', repo: 'repo', path: 'docs/' });
      expect(mockClient.listSources).toHaveBeenCalledWith('test', 'repo', 'docs');
    });

    it('should normalize empty path', async () => {
      await handleListSources(mockClient, { org: 'test', repo: 'repo', path: '' });
      expect(mockClient.listSources).toHaveBeenCalledWith('test', 'repo', '');
    });

    it('should normalize single slash to empty string', async () => {
      await handleListSources(mockClient, { org: 'test', repo: 'repo', path: '/' });
      expect(mockClient.listSources).toHaveBeenCalledWith('test', 'repo', '');
    });

    it('should not modify valid path', async () => {
      await handleListSources(mockClient, { org: 'test', repo: 'repo', path: 'docs/file' });
      expect(mockClient.listSources).toHaveBeenCalledWith('test', 'repo', 'docs/file');
    });
  });

  describe('handleGetSource', () => {
    it('should normalize path with leading slash', async () => {
      await handleGetSource(mockClient, { org: 'test', repo: 'repo', path: '/docs/file.md' });
      expect(mockClient.getSource).toHaveBeenCalledWith('test', 'repo', 'docs/file.md');
    });

    it('should normalize path with both slashes', async () => {
      await handleGetSource(mockClient, { org: 'test', repo: 'repo', path: '/docs/file.md/' });
      expect(mockClient.getSource).toHaveBeenCalledWith('test', 'repo', 'docs/file.md');
    });

    it('should add .html extension when not provided', async () => {
      await handleGetSource(mockClient, { org: 'test', repo: 'repo', path: 'docs/page' });
      expect(mockClient.getSource).toHaveBeenCalledWith('test', 'repo', 'docs/page.html');
    });

    it('should preserve non-.html extensions', async () => {
      await handleGetSource(mockClient, { org: 'test', repo: 'repo', path: 'data/config.json' });
      expect(mockClient.getSource).toHaveBeenCalledWith('test', 'repo', 'data/config.json');
    });
  });

  describe('handleCreateSource', () => {
    it('should normalize path with leading slash', async () => {
      await handleCreateSource(mockClient, {
        org: 'test',
        repo: 'repo',
        path: '/docs/file.md',
        content: 'test',
      });
      expect(mockClient.createSource).toHaveBeenCalledWith('test', 'repo', 'docs/file.md', 'test', undefined);
    });

    it('should add .html extension when not provided', async () => {
      await handleCreateSource(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'docs/newpage',
        content: 'test',
      });
      expect(mockClient.createSource).toHaveBeenCalledWith('test', 'repo', 'docs/newpage.html', 'test', undefined);
    });
  });

  describe('handleUpdateSource', () => {
    it('should normalize path with leading slash', async () => {
      await handleUpdateSource(mockClient, {
        org: 'test',
        repo: 'repo',
        path: '/docs/file.md',
        content: 'test',
      });
      expect(mockClient.updateSource).toHaveBeenCalledWith('test', 'repo', 'docs/file.md', 'test', undefined);
    });

    it('should add .html extension when not provided', async () => {
      await handleUpdateSource(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'docs/page',
        content: 'updated',
      });
      expect(mockClient.updateSource).toHaveBeenCalledWith('test', 'repo', 'docs/page.html', 'updated', undefined);
    });
  });

  describe('handleDeleteSource', () => {
    it('should normalize path with leading slash', async () => {
      await handleDeleteSource(mockClient, { org: 'test', repo: 'repo', path: '/docs/file.md' });
      expect(mockClient.deleteSource).toHaveBeenCalledWith('test', 'repo', 'docs/file.md');
    });

    it('should add .html extension when not provided', async () => {
      await handleDeleteSource(mockClient, { org: 'test', repo: 'repo', path: 'docs/oldpage' });
      expect(mockClient.deleteSource).toHaveBeenCalledWith('test', 'repo', 'docs/oldpage.html');
    });
  });

  describe('handleCopyContent', () => {
    it('should normalize both source and destination paths with leading slashes', async () => {
      await handleCopyContent(mockClient, {
        org: 'test',
        repo: 'repo',
        sourcePath: '/old.md',
        destinationPath: '/new.md',
      });
      expect(mockClient.copyContent).toHaveBeenCalledWith('test', 'repo', 'old.md', 'new.md');
    });

    it('should normalize paths with trailing slashes', async () => {
      await handleCopyContent(mockClient, {
        org: 'test',
        repo: 'repo',
        sourcePath: 'old/',
        destinationPath: 'new/',
      });
      expect(mockClient.copyContent).toHaveBeenCalledWith('test', 'repo', 'old.html', 'new.html');
    });

    it('should normalize paths with both leading and trailing slashes', async () => {
      await handleCopyContent(mockClient, {
        org: 'test',
        repo: 'repo',
        sourcePath: '/docs/old/',
        destinationPath: '/docs/new/',
      });
      expect(mockClient.copyContent).toHaveBeenCalledWith('test', 'repo', 'docs/old.html', 'docs/new.html');
    });

    it('should add .html extension to paths without extensions', async () => {
      await handleCopyContent(mockClient, {
        org: 'test',
        repo: 'repo',
        sourcePath: 'source-page',
        destinationPath: 'dest-page',
      });
      expect(mockClient.copyContent).toHaveBeenCalledWith('test', 'repo', 'source-page.html', 'dest-page.html');
    });
  });

  describe('handleMoveContent', () => {
    it('should normalize both source and destination paths with leading slashes', async () => {
      await handleMoveContent(mockClient, {
        org: 'test',
        repo: 'repo',
        sourcePath: '/old.html',
        destinationPath: '/new.html',
      });
      expect(mockClient.moveContent).toHaveBeenCalledWith('test', 'repo', 'old.html', 'new.html');
    });

    it('should add .html extension to paths without extensions', async () => {
      await handleMoveContent(mockClient, {
        org: 'test',
        repo: 'repo',
        sourcePath: 'oldpage',
        destinationPath: 'newpage',
      });
      expect(mockClient.moveContent).toHaveBeenCalledWith('test', 'repo', 'oldpage.html', 'newpage.html');
    });
  });

  describe('handleGetVersions', () => {
    it('should normalize path with leading slash', async () => {
      await handleGetVersions(mockClient, { org: 'test', repo: 'repo', path: '/docs/file.md' });
      expect(mockClient.getVersions).toHaveBeenCalledWith('test', 'repo', 'docs/file.md');
    });

    it('should add .html extension when not provided', async () => {
      await handleGetVersions(mockClient, { org: 'test', repo: 'repo', path: 'docs/page' });
      expect(mockClient.getVersions).toHaveBeenCalledWith('test', 'repo', 'docs/page.html');
    });
  });

  describe('handleLookupMedia', () => {
    it('should normalize mediaPath with leading slash', async () => {
      await handleLookupMedia(mockClient, { org: 'test', repo: 'repo', mediaPath: '/media/image.png' });
      expect(mockClient.lookupMedia).toHaveBeenCalledWith('test', 'repo', 'media/image.png');
    });

    it('should return image content type for image responses', async () => {
      mockClient.lookupMedia.mockResolvedValue({ data: 'abc123', mimeType: 'image/jpeg' });
      const result = await handleLookupMedia(mockClient, { org: 'test', repo: 'repo', mediaPath: 'media/photo.jpg' });
      expect(result.content[0].type).toBe('image');
      expect(result.content[0].data).toBe('abc123');
      expect(result.content[0].mimeType).toBe('image/jpeg');
    });

    it('should return text content type for non-image responses', async () => {
      mockClient.lookupMedia.mockResolvedValue({ data: 'abc123', mimeType: 'application/pdf' });
      const result = await handleLookupMedia(mockClient, { org: 'test', repo: 'repo', mediaPath: 'docs/file.pdf' });
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('handleLookupFragment', () => {
    it('should normalize fragmentPath with leading slash', async () => {
      await handleLookupFragment(mockClient, { org: 'test', repo: 'repo', fragmentPath: '/fragments/footer' });
      expect(mockClient.lookupFragment).toHaveBeenCalledWith('test', 'repo', 'fragments/footer');
    });
  });

  describe('handleUploadMedia', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should strip data URL prefix before uploading', async () => {
      await handleUploadMedia(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'media/image.png',
        base64Data: 'data:image/png;base64,Zm9v',
        mimeType: 'image/png',
        fileName: 'image.png',
      });

      expect(mockClient.uploadMedia).toHaveBeenCalledWith(
        'test',
        'repo',
        'media/image.png',
        'Zm9v',
        'image/png',
        'image.png',
      );
    });

    it('should fetch from sourceUrl and upload with derived mimeType and fileName', async () => {
      const bytes = new Uint8Array([102, 111, 111]); // "foo" → base64 "Zm9v"
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'image/jpeg; charset=utf-8' : null) },
        arrayBuffer: async () => bytes.buffer,
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await handleUploadMedia(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'docs/.my-page/hero.jpg',
        sourceUrl: 'https://firefly.example.com/assets/generated-image.jpg',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        'https://firefly.example.com/assets/generated-image.jpg',
        expect.objectContaining({ signal: expect.anything() }),
      );
      expect(mockClient.uploadMedia).toHaveBeenCalledWith(
        'test',
        'repo',
        'docs/.my-page/hero.jpg',
        'Zm9v',
        'image/jpeg',
        'generated-image.jpg',
      );
      expect(result.isError).toBeUndefined();
    });

    it('should prefer explicit mimeType and fileName over derived values', async () => {
      const bytes = new Uint8Array([102, 111, 111]);
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => 'image/jpeg' },
        arrayBuffer: async () => bytes.buffer,
      });
      vi.stubGlobal('fetch', fetchMock);

      await handleUploadMedia(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'media/x.bin',
        sourceUrl: 'https://firefly.example.com/assets/generated-image.jpg',
        mimeType: 'image/png',
        fileName: 'custom.png',
      });

      expect(mockClient.uploadMedia).toHaveBeenCalledWith(
        'test',
        'repo',
        'media/x.bin',
        'Zm9v',
        'image/png',
        'custom.png',
      );
    });

    it('should fall back to application/octet-stream when no content-type is present', async () => {
      const bytes = new Uint8Array([102, 111, 111]);
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { get: () => null },
        arrayBuffer: async () => bytes.buffer,
      });
      vi.stubGlobal('fetch', fetchMock);

      await handleUploadMedia(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'media/asset',
        sourceUrl: 'https://firefly.example.com/download',
      });

      expect(mockClient.uploadMedia).toHaveBeenCalledWith(
        'test',
        'repo',
        'media/asset',
        'Zm9v',
        'application/octet-stream',
        'download',
      );
    });

    it('should error when both base64Data and sourceUrl are provided', async () => {
      const result = await handleUploadMedia(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'media/image.png',
        base64Data: 'Zm9v',
        sourceUrl: 'https://firefly.example.com/image.png',
      });

      expect(result.isError).toBe(true);
      expect(mockClient.uploadMedia).not.toHaveBeenCalled();
    });

    it('should error when neither base64Data nor sourceUrl is provided', async () => {
      const result = await handleUploadMedia(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'media/image.png',
      });

      expect(result.isError).toBe(true);
      expect(mockClient.uploadMedia).not.toHaveBeenCalled();
    });

    it('should error on non-http(s) URL schemes', async () => {
      const result = await handleUploadMedia(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'media/image.png',
        sourceUrl: 'file:///etc/passwd',
      });

      expect(result.isError).toBe(true);
      expect(mockClient.uploadMedia).not.toHaveBeenCalled();
    });

    it('should error when the fetch response is not OK', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: { get: () => null },
        arrayBuffer: async () => new Uint8Array().buffer,
      });
      vi.stubGlobal('fetch', fetchMock);

      const result = await handleUploadMedia(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'media/image.png',
        sourceUrl: 'https://firefly.example.com/missing.png',
      });

      expect(result.isError).toBe(true);
      expect(mockClient.uploadMedia).not.toHaveBeenCalled();
    });
  });
});
