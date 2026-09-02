import {
  describe, it, expect, vi, beforeEach,
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
  });
});
