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
  handleLookupMedia,
  handleLookupFragment,
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
      lookupMedia: vi.fn().mockResolvedValue({ url: '' }),
      lookupFragment: vi.fn().mockResolvedValue({ url: '' }),
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
        sourcePath: '/old.md',
        destinationPath: '/new.md',
      });
      expect(mockClient.moveContent).toHaveBeenCalledWith('test', 'repo', 'old.md', 'new.md');
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
  });

  describe('handleLookupFragment', () => {
    it('should normalize fragmentPath with leading slash', async () => {
      await handleLookupFragment(mockClient, { org: 'test', repo: 'repo', fragmentPath: '/fragments/footer' });
      expect(mockClient.lookupFragment).toHaveBeenCalledWith('test', 'repo', 'fragments/footer');
    });
  });
});
