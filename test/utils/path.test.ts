import { describe, it, expect } from 'vitest';
import { normalizePath, normalizePagePath } from '../../src/utils/path';

describe('normalizePath', () => {
  describe('leading slash removal', () => {
    it('should remove leading slash from absolute path', () => {
      expect(normalizePath('/docs/file.md')).toBe('docs/file.md');
    });

    it('should remove leading slash from nested path', () => {
      expect(normalizePath('/path/to/nested/file.md')).toBe('path/to/nested/file.md');
    });

    it('should handle single leading slash', () => {
      expect(normalizePath('/file.md')).toBe('file.md');
    });

    it('should remove multiple leading slashes', () => {
      expect(normalizePath('///file.md')).toBe('file.md');
    });
  });

  describe('trailing slash removal', () => {
    it('should remove trailing slash from directory path', () => {
      expect(normalizePath('docs/file.md/')).toBe('docs/file.md');
    });

    it('should remove trailing slash from simple path', () => {
      expect(normalizePath('docs/')).toBe('docs');
    });

    it('should remove multiple trailing slashes', () => {
      expect(normalizePath('docs///')).toBe('docs');
    });
  });

  describe('both leading and trailing slash removal', () => {
    it('should remove both leading and trailing slashes', () => {
      expect(normalizePath('/docs/file.md/')).toBe('docs/file.md');
    });

    it('should handle directory with both slashes', () => {
      expect(normalizePath('/docs/')).toBe('docs');
    });

    it('should handle single slash', () => {
      expect(normalizePath('/')).toBe('');
    });

    it('should handle multiple slashes', () => {
      expect(normalizePath('///')).toBe('');
    });
  });

  describe('no modification needed', () => {
    it('should not modify path without slashes', () => {
      expect(normalizePath('docs/file.md')).toBe('docs/file.md');
    });

    it('should not modify simple filename', () => {
      expect(normalizePath('file.md')).toBe('file.md');
    });

    it('should preserve empty string', () => {
      expect(normalizePath('')).toBe('');
    });

    it('should trim whitespace', () => {
      expect(normalizePath('  docs/file.md  ')).toBe('docs/file.md');
    });

    it('should treat whitespace-only as empty', () => {
      expect(normalizePath('   ')).toBe('');
    });
  });

  describe('undefined handling', () => {
    it('should return undefined for undefined input', () => {
      expect(normalizePath(undefined)).toBe(undefined);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple nested directories', () => {
      expect(normalizePath('/a/b/c/d/e/file.md')).toBe('a/b/c/d/e/file.md');
    });

    it('should handle paths with special characters', () => {
      expect(normalizePath('/docs/my-file_2024.md')).toBe('docs/my-file_2024.md');
    });

    it('should handle paths with dots', () => {
      expect(normalizePath('/.github/workflows/deploy.yml')).toBe('.github/workflows/deploy.yml');
    });
  });
});

describe('normalizePagePath', () => {
  describe('adding .html extension', () => {
    it('should add .html to path without extension', () => {
      expect(normalizePagePath('docs/file')).toBe('docs/file.html');
    });

    it('should add .html to simple filename without extension', () => {
      expect(normalizePagePath('file')).toBe('file.html');
    });

    it('should add .html to nested path without extension', () => {
      expect(normalizePagePath('docs/subfolder/page')).toBe('docs/subfolder/page.html');
    });
  });

  describe('preserving existing extensions', () => {
    it('should not modify path with .html extension', () => {
      expect(normalizePagePath('docs/file.html')).toBe('docs/file.html');
    });

    it('should not modify path with .md extension', () => {
      expect(normalizePagePath('docs/file.md')).toBe('docs/file.md');
    });

    it('should not modify path with .json extension', () => {
      expect(normalizePagePath('config/settings.json')).toBe('config/settings.json');
    });

    it('should not modify path with .xml extension', () => {
      expect(normalizePagePath('data/feed.xml')).toBe('data/feed.xml');
    });

    it('should not modify path with .txt extension', () => {
      expect(normalizePagePath('readme.txt')).toBe('readme.txt');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(normalizePagePath('')).toBe('');
    });

    it('should handle undefined', () => {
      expect(normalizePagePath(undefined)).toBe(undefined);
    });

    it('should handle filename with multiple dots', () => {
      expect(normalizePagePath('file.min.js')).toBe('file.min.js');
    });

    it('should handle directory with dots in name', () => {
      expect(normalizePagePath('v1.0/page')).toBe('v1.0/page.html');
    });

    it('should handle path with dots in directory names', () => {
      expect(normalizePagePath('.config/settings')).toBe('.config/settings.html');
    });

    it('should normalize and add extension in one step', () => {
      expect(normalizePagePath('  /docs/page  ')).toBe('docs/page.html');
    });
  });
});
