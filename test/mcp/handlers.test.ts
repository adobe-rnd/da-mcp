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
  handleCreateVersion,
  handleGetVersion,
  handleLookupMedia,
  handleLookupFragment,
  handleUploadMedia,
  handlePreviewContent,
  handleUnpreviewContent,
  handlePublishContent,
  handleUnpublishContent,
} from '../../src/mcp/handlers';

// Mock the DA Admin Client
vi.mock('../../src/da-admin/client');

describe('formatError backend labeling', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = { getSource: vi.fn() };
  });

  it('labels errors from the legacy DA Admin backend', async () => {
    mockClient.getSource.mockRejectedValue({
      status: 400, message: 'Bad Request', backend: 'da-admin',
    });

    const result = await handleGetSource(mockClient, { org: 'acme', repo: 'site1', path: 'docs/page.html' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('DA Admin API Error (400): Bad Request');
    expect(result.content[0].text).not.toContain('AEM Admin API Error');
  });

  it('labels errors from the HLX6 AEM Admin backend', async () => {
    mockClient.getSource.mockRejectedValue({
      status: 400, message: 'Bad Request', backend: 'aem-admin',
    });

    const result = await handleGetSource(mockClient, { org: 'acme', repo: 'site1', path: 'docs/page.html' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('AEM Admin API Error (400): Bad Request');
  });

  it('falls back to a generic Admin API Error label when backend is unspecified', async () => {
    mockClient.getSource.mockRejectedValue({ status: 500, message: 'Internal Server Error' });

    const result = await handleGetSource(mockClient, { org: 'acme', repo: 'site1', path: 'docs/page.html' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Admin API Error (500): Internal Server Error');
  });
});

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
      createVersion: vi.fn().mockResolvedValue({ success: true }),
      getVersion: vi.fn().mockResolvedValue('version content'),
      lookupMedia: vi.fn().mockResolvedValue({ data: 'base64imagedata', mimeType: 'image/png' }),
      lookupFragment: vi.fn().mockResolvedValue({ url: '' }),
      uploadMedia: vi.fn().mockResolvedValue({ success: true }),
      previewContent: vi.fn().mockResolvedValue({ success: true }),
      unpreviewContent: vi.fn().mockResolvedValue({ success: true }),
      publishContent: vi.fn().mockResolvedValue({ success: true }),
      unpublishContent: vi.fn().mockResolvedValue({ success: true }),
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

  describe('handlePreviewContent', () => {
    it('should normalize path with leading slash', async () => {
      await handlePreviewContent(mockClient, { org: 'test', repo: 'repo', path: '/docs/page' });
      expect(mockClient.previewContent).toHaveBeenCalledWith('test', 'repo', 'docs/page');
    });

    it('should strip a .html extension, since preview URLs never include one', async () => {
      await handlePreviewContent(mockClient, { org: 'test', repo: 'repo', path: 'docs/page.html' });
      expect(mockClient.previewContent).toHaveBeenCalledWith('test', 'repo', 'docs/page');
    });
  });

  describe('handleUnpreviewContent', () => {
    it('should normalize path with leading slash', async () => {
      await handleUnpreviewContent(mockClient, { org: 'test', repo: 'repo', path: '/docs/page' });
      expect(mockClient.unpreviewContent).toHaveBeenCalledWith('test', 'repo', 'docs/page');
    });

    it('should strip a .html extension, since preview URLs never include one', async () => {
      await handleUnpreviewContent(mockClient, { org: 'test', repo: 'repo', path: 'docs/page.html' });
      expect(mockClient.unpreviewContent).toHaveBeenCalledWith('test', 'repo', 'docs/page');
    });
  });

  describe('handlePublishContent', () => {
    it('should normalize path with leading slash', async () => {
      await handlePublishContent(mockClient, { org: 'test', repo: 'repo', path: '/docs/page' });
      expect(mockClient.publishContent).toHaveBeenCalledWith('test', 'repo', 'docs/page');
    });

    it('should strip a .html extension, since live URLs never include one', async () => {
      await handlePublishContent(mockClient, { org: 'test', repo: 'repo', path: 'docs/page.html' });
      expect(mockClient.publishContent).toHaveBeenCalledWith('test', 'repo', 'docs/page');
    });
  });

  describe('handleUnpublishContent', () => {
    it('should normalize path with leading slash', async () => {
      await handleUnpublishContent(mockClient, { org: 'test', repo: 'repo', path: '/docs/page' });
      expect(mockClient.unpublishContent).toHaveBeenCalledWith('test', 'repo', 'docs/page');
    });

    it('should strip a .html extension, since live URLs never include one', async () => {
      await handleUnpublishContent(mockClient, { org: 'test', repo: 'repo', path: 'docs/page.html' });
      expect(mockClient.unpublishContent).toHaveBeenCalledWith('test', 'repo', 'docs/page');
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

  describe('handleCreateVersion', () => {
    it('should normalize path with leading slash', async () => {
      await handleCreateVersion(mockClient, { org: 'test', repo: 'repo', path: '/docs/file.md' });
      expect(mockClient.createVersion).toHaveBeenCalledWith('test', 'repo', 'docs/file.md', undefined);
    });

    it('should add .html extension when not provided', async () => {
      await handleCreateVersion(mockClient, { org: 'test', repo: 'repo', path: 'docs/page' });
      expect(mockClient.createVersion).toHaveBeenCalledWith('test', 'repo', 'docs/page.html', undefined);
    });

    it('should pass through an optional label', async () => {
      await handleCreateVersion(mockClient, {
        org: 'test', repo: 'repo', path: 'docs/file.md', label: 'Before redesign',
      });
      expect(mockClient.createVersion).toHaveBeenCalledWith('test', 'repo', 'docs/file.md', 'Before redesign');
    });
  });

  describe('handleGetVersion', () => {
    it('should normalize path with leading slash but leave versionId untouched', async () => {
      await handleGetVersion(mockClient, {
        org: 'test', repo: 'repo', path: '/docs/file.md', versionId: '/versionsource/test/abc/def.html',
      });
      expect(mockClient.getVersion).toHaveBeenCalledWith(
        'test',
        'repo',
        'docs/file.md',
        '/versionsource/test/abc/def.html',
      );
    });

    it('should add .html extension to path when not provided', async () => {
      await handleGetVersion(mockClient, {
        org: 'test', repo: 'repo', path: 'docs/page', versionId: 'v1',
      });
      expect(mockClient.getVersion).toHaveBeenCalledWith('test', 'repo', 'docs/page.html', 'v1');
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
      vi.useRealTimers();
    });

    it('should abort a stalled body after the fetch timeout and release the reader', async () => {
      vi.useFakeTimers();
      let streamController: ReadableStreamDefaultController<Uint8Array>;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          streamController = controller;
          controller.enqueue(new Uint8Array([1]));
        },
      });
      let signal: AbortSignal;
      vi.stubGlobal('fetch', vi.fn().mockImplementation(async (_url, options) => {
        signal = options.signal;
        signal.addEventListener('abort', () => {
          streamController.error(new DOMException('aborted', 'AbortError'));
        });
        return new Response(body, { headers: { 'Content-Type': 'image/png' } });
      }));

      const pending = handleUploadMedia(mockClient, {
        org: 'test', repo: 'repo', path: 'media/image.png', sourceUrl: 'https://assets.example.com/image.png',
      });
      await vi.advanceTimersByTimeAsync(30000);
      const result = await pending;

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Timed out fetching sourceUrl');
      expect(signal!.aborted).toBe(true);
      expect(body.locked).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
      expect(mockClient.uploadMedia).not.toHaveBeenCalled();
    });

    it('should preserve a stream read error and release the reader', async () => {
      const body = new ReadableStream<Uint8Array>({
        pull(controller) { controller.error(new Error('stream failed')); },
      });
      const fetchMock = vi.fn().mockResolvedValue(new Response(body, {
        headers: { 'Content-Type': 'image/png' },
      }));
      vi.stubGlobal('fetch', fetchMock);

      const result = await handleUploadMedia(mockClient, {
        org: 'test', repo: 'repo', path: 'media/image.png', sourceUrl: 'https://assets.example.com/image.png',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('stream failed');
      expect(body.locked).toBe(false);
      expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
      expect(mockClient.uploadMedia).not.toHaveBeenCalled();
    });

    it('should abort an oversized declared response before reading its body', async () => {
      const pull = vi.fn();
      const body = new ReadableStream<Uint8Array>({ pull }, { highWaterMark: 0 });
      const fetchMock = vi.fn().mockResolvedValue(new Response(body, {
        headers: { 'Content-Length': '10000000', 'Content-Type': 'image/png' },
      }));
      vi.stubGlobal('fetch', fetchMock);

      const result = await handleUploadMedia(mockClient, {
        org: 'test', repo: 'repo', path: 'media/image.png', sourceUrl: 'https://assets.example.com/image.png',
      });

      expect(result.isError).toBe(true);
      expect(pull).not.toHaveBeenCalled();
      expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
      expect(mockClient.uploadMedia).not.toHaveBeenCalled();
    });

    it.each([undefined, '1'])('should stop and cancel an oversized stream with Content-Length %s', async (contentLength) => {
      let bytesRead = 0;
      const cancel = vi.fn();
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (bytesRead === 8 * 1024 * 1024) {
            controller.close();
            return;
          }
          controller.enqueue(new Uint8Array(1024 * 1024));
          bytesRead += 1024 * 1024;
        },
        cancel,
      }, { highWaterMark: 0 });
      const headers = new Headers({ 'Content-Type': 'image/png' });
      if (contentLength) headers.set('Content-Length', contentLength);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { headers })));

      const result = await handleUploadMedia(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'media/big.png',
        sourceUrl: 'https://assets.example.com/big.png',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('File is too large');
      expect(bytesRead).toBe(5 * 1024 * 1024);
      expect(cancel).toHaveBeenCalledOnce();
      expect(body.locked).toBe(false);
      expect(mockClient.uploadMedia).not.toHaveBeenCalled();
    });

    it('should upload a multi-chunk stream at the exact size limit', async () => {
      const bytes = new Uint8Array(4.5 * 1024 * 1024).fill(42);
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(bytes.slice(0, 1024 * 1024));
          controller.enqueue(bytes.slice(1024 * 1024));
          controller.close();
        },
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, {
        headers: { 'Content-Type': 'image/png' },
      })));

      const result = await handleUploadMedia(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'media/image.png',
        sourceUrl: 'https://assets.example.com/image.png',
      });

      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text).byteSize).toBe(bytes.length);
      const uploaded = mockClient.uploadMedia.mock.calls[0][3];
      expect(Buffer.from(uploaded, 'base64')).toEqual(Buffer.from(bytes));
      expect(body.locked).toBe(false);
    });

    it('should report the generated media URL without claiming a destination path', async () => {
      const url = 'https://main--repo--test.aem.page/media_123.png';
      mockClient.uploadMedia.mockResolvedValue({
        success: true, url, width: 100, height: 50,
      });

      const result = await handleUploadMedia(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'docs/.page/image.png',
        base64Data: 'Zm9v',
        mimeType: 'image/png',
      });

      expect(JSON.parse(result.content[0].text)).toMatchObject({
        success: true,
        url,
        width: 100,
        height: 50,
        message: `Media uploaded successfully to ${url}`,
      });
      expect(JSON.parse(result.content[0].text)).not.toHaveProperty('path');
    });

    it('should retain the destination path for legacy DA uploads', async () => {
      mockClient.uploadMedia.mockResolvedValue({ success: true });

      const result = await handleUploadMedia(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'media/image.png',
        base64Data: 'Zm9v',
        mimeType: 'image/png',
      });

      expect(JSON.parse(result.content[0].text)).toMatchObject({
        path: 'media/image.png',
        message: 'Media uploaded successfully to media/image.png',
      });
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
      const fetchMock = vi.fn().mockResolvedValue(new Response(bytes, {
        headers: { 'Content-Type': 'image/jpeg; charset=utf-8' },
      }));
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
      const fetchMock = vi.fn().mockResolvedValue(new Response(bytes, {
        headers: { 'Content-Type': 'image/jpeg' },
      }));
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

    it('should reject with application/octet-stream when no content-type is present and none is provided', async () => {
      const bytes = new Uint8Array([102, 111, 111]);
      const fetchMock = vi.fn().mockResolvedValue(new Response(bytes));
      vi.stubGlobal('fetch', fetchMock);

      const result = await handleUploadMedia(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'media/asset',
        sourceUrl: 'https://firefly.example.com/download',
      });

      expect(result.isError).toBe(true);
      expect(mockClient.uploadMedia).not.toHaveBeenCalled();
    });

    it('should reject a disallowed mimeType', async () => {
      const result = await handleUploadMedia(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'media/script.js',
        base64Data: 'Zm9v',
        mimeType: 'application/javascript',
      });

      expect(result.isError).toBe(true);
      expect(mockClient.uploadMedia).not.toHaveBeenCalled();
    });

    it.each([
      'image/svg+xml',
      'image/jpeg',
      'image/png',
      'image/avif',
      'image/webp',
    ])('should allow mimeType %s', async (mimeType) => {
      const result = await handleUploadMedia(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'media/asset',
        base64Data: 'Zm9v',
        mimeType,
      });

      expect(result.isError).toBeUndefined();
      expect(mockClient.uploadMedia).toHaveBeenCalledWith(
        'test',
        'repo',
        'media/asset',
        'Zm9v',
        mimeType,
        'asset',
      );
    });

    it('should reject base64Data larger than the 4.5MB size limit', async () => {
      const oversizedBase64 = 'A'.repeat(7_000_000); // decodes to > 4.5MB

      const result = await handleUploadMedia(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'media/big.png',
        base64Data: oversizedBase64,
        mimeType: 'image/png',
      });

      expect(result.isError).toBe(true);
      expect(mockClient.uploadMedia).not.toHaveBeenCalled();
    });

    it('should reject a sourceUrl response whose Content-Length exceeds the size limit', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, {
        headers: { 'Content-Length': '10000000' },
      }));
      vi.stubGlobal('fetch', fetchMock);

      const result = await handleUploadMedia(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'media/big.png',
        sourceUrl: 'https://firefly.example.com/huge.png',
        mimeType: 'image/png',
      });

      expect(result.isError).toBe(true);
      expect(mockClient.uploadMedia).not.toHaveBeenCalled();
    });

    it('should reject a sourceUrl response body larger than the size limit even without Content-Length', async () => {
      const bytes = new Uint8Array(6 * 1024 * 1024); // 6MB, no Content-Length header
      const fetchMock = vi.fn().mockResolvedValue(new Response(bytes));
      vi.stubGlobal('fetch', fetchMock);

      const result = await handleUploadMedia(mockClient, {
        org: 'test',
        repo: 'repo',
        path: 'media/big.png',
        sourceUrl: 'https://firefly.example.com/huge.png',
        mimeType: 'image/png',
      });

      expect(result.isError).toBe(true);
      expect(mockClient.uploadMedia).not.toHaveBeenCalled();
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
      const fetchMock = vi.fn().mockResolvedValue(new Response(null, {
        status: 404,
        statusText: 'Not Found',
      }));
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
