/**
 * MCP Server Setup
 * Initialize and configure the MCP server with all tools
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { IAdminClient } from '../da-admin/types';
import {
  handleListSources,
  handleSearchSources,
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
  handleUploadMedia,
  handleLookupFragment,
  handlePreviewContent,
  handleUnpreviewContent,
  handlePublishContent,
  handleUnpublishContent,
} from './handlers';

/**
 * Create and configure MCP server with all DA tools registered
 */
const INSTRUCTIONS = 'This server manages content on Experience Workspace / Document Authoring (DA) sites. '
  + 'Every tool requires org and repo (the site\'s organization and repository/site name). '
  + 'Use da_list_sources to browse folders and files, da_get_source to read a page or file\'s content, '
  + 'and da_create_source / da_update_source to create or edit pages. '
  + 'Paths are relative to the site root; a leading slash is optional and stripped automatically, '
  + 'and a path with no file extension is treated as an HTML page and given a .html extension automatically.';

export function createServer(client: IAdminClient, version: string): McpServer {
  const server = new McpServer({ name: 'da-live-admin', version }, { instructions: INSTRUCTIONS });

  server.registerTool('da_list_sources', {
    description: 'List all sources and directories in a site at a given path. Returns a list of files and folders with their metadata.',
    inputSchema: z.object({
      org: z.string().describe('Organization name (e.g., "adobe")'),
      repo: z.string().describe('Site / Repository name (e.g., "my-docs")'),
      path: z.string().optional().describe('Optional path within repository (e.g., "docs/guides"). Leave empty for root.'),
    }),
    annotations: { readOnlyHint: true },
  }, (args) => handleListSources(client, args) as Promise<CallToolResult>);

  server.registerTool('da_search_sources', {
    description: 'Search a site for pages/files by metadata and content. Recursively walks the tree under '
      + 'an optional path and filters by last-modified date range, file extension, name, and full-text content. '
      + 'Returns matching files with a content snippet when a text query is given. Use this to locate content '
      + 'without browsing folder by folder (e.g. "html pages changed since 2026-01-01 that mention checkout").',
    inputSchema: z.object({
      org: z.string().describe('Organization name (e.g., "adobe")'),
      repo: z.string().describe('Site / Repository name (e.g., "my-docs")'),
      path: z.string().optional().describe('Optional path to scope the search to. Leave empty to search from the root.'),
      modifiedSince: z.string().optional().describe('Only files modified on or after this UTC date (YYYY-MM-DD).'),
      modifiedUntil: z.string().optional().describe('Only files modified on or before this UTC date (YYYY-MM-DD).'),
      text: z.string().optional().describe('Case-insensitive text that must appear in the file content (full-text search).'),
      ext: z.string().optional().describe('File extension to match, with or without the dot (e.g. "html").'),
      nameContains: z.string().optional().describe('Case-insensitive substring the file name or path must contain.'),
      maxDepth: z.number().optional().describe('How many directory levels to descend below path. Default 4.'),
      maxResults: z.number().optional().describe('Maximum number of matches to return. Default 50.'),
    }),
    annotations: { readOnlyHint: true },
  }, (args) => handleSearchSources(client, args) as Promise<CallToolResult>);

  server.registerTool('da_get_source', {
    description: 'Get the content of a specific source file from a site. Returns the file content and metadata.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Site / Repository name'),
      path: z.string().describe('Path to the file within the repository (e.g., "docs/index.md")'),
    }),
    annotations: { readOnlyHint: true },
  }, (args) => handleGetSource(client, args) as Promise<CallToolResult>);

  server.registerTool('da_create_source', {
    description: 'Create a new source file in a site with the specified content.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Site / Repository name'),
      path: z.string().describe('Path where the new file should be created (e.g., "docs/new-page.md")'),
      content: z.string().describe('Content of the new file'),
      contentType: z.string().optional().describe('Optional content type (e.g., "text/markdown", "text/html")'),
    }),
    annotations: { readOnlyHint: false, idempotentHint: false },
  }, (args) => handleCreateSource(client, args) as Promise<CallToolResult>);

  server.registerTool('da_update_source', {
    description: 'Update an existing source file in a site with new content.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Site / Repository name'),
      path: z.string().describe('Path to the file to update'),
      content: z.string().describe('New content for the file'),
      contentType: z.string().optional().describe('Optional content type'),
    }),
    annotations: { readOnlyHint: false, idempotentHint: true },
  }, (args) => handleUpdateSource(client, args) as Promise<CallToolResult>);

  server.registerTool('da_delete_source', {
    description: 'Delete a source file from a site. Use with caution as this operation cannot be undone.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Site / Repository name'),
      path: z.string().describe('Path to the file to delete'),
    }),
    annotations: { readOnlyHint: false, idempotentHint: true },
  }, (args) => handleDeleteSource(client, args) as Promise<CallToolResult>);

  server.registerTool('da_copy_content', {
    description: 'Copy content from one location to another within a site. Creates a duplicate of the source at the destination.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Site / Repository name'),
      sourcePath: z.string().describe('Path to the source file to copy from'),
      destinationPath: z.string().describe('Path where the file should be copied to'),
    }),
    annotations: { readOnlyHint: false, idempotentHint: false },
  }, (args) => handleCopyContent(client, args) as Promise<CallToolResult>);

  server.registerTool('da_move_content', {
    description: 'Move content from one location to another within a site. The source file will be removed.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Site / Repository name'),
      sourcePath: z.string().describe('Path to the source file to move from'),
      destinationPath: z.string().describe('Path where the file should be moved to'),
    }),
    annotations: { readOnlyHint: false, idempotentHint: false },
  }, (args) => handleMoveContent(client, args) as Promise<CallToolResult>);

  server.registerTool('da_get_versions', {
    description: 'Get version history for a source file in a site. Returns a list of versions with timestamps and metadata.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Site / Repository name'),
      path: z.string().describe('Path to the file'),
    }),
    annotations: { readOnlyHint: true },
  }, (args) => handleGetVersions(client, args) as Promise<CallToolResult>);

  server.registerTool('da_create_version', {
    description: 'Create a snapshot version of a source file in a site. '
      + 'Versions are also created automatically when a file is updated, so this is '
      + 'mainly useful to explicitly checkpoint a file before making risky changes.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Site / Repository name'),
      path: z.string().describe('Path to the file to version'),
      label: z.string().optional().describe('Optional label for this version (e.g., "Before Migration", "Backup")'),
    }),
    // destructiveHint: false is honest here (unlike da_create_source) - creating a version
    // snapshot never overwrites or removes the live document or any other version, on either
    // backend.
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  }, (args) => handleCreateVersion(client, args) as Promise<CallToolResult>);

  server.registerTool('da_get_version', {
    description: 'Get the content of a specific version of a source file. '
      + 'The versionId must be the "url" value for that version from a prior '
      + 'da_get_versions call — it is an opaque identifier (its exact shape '
      + 'differs by backend) and should not be constructed manually.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Site / Repository name'),
      path: z.string().describe('Path to the file'),
      versionId: z.string().describe('The "url" value for the desired version, from a prior da_get_versions call'),
    }),
    annotations: { readOnlyHint: true },
  }, (args) => handleGetVersion(client, args) as Promise<CallToolResult>);

  server.registerTool('da_lookup_media', {
    description: 'Lookup media references in a site. Returns information about media assets including URLs and metadata.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Site / Repository name'),
      mediaPath: z.string().describe('Path to the media file'),
    }),
    annotations: { readOnlyHint: true },
  }, (args) => handleLookupMedia(client, args) as Promise<CallToolResult>);

  server.registerTool('da_lookup_fragment', {
    description: 'Lookup fragment references in a site. Returns information about content fragments.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Site / Repository name'),
      fragmentPath: z.string().describe('Path to the fragment'),
    }),
    annotations: { readOnlyHint: true },
  }, (args) => handleLookupFragment(client, args) as Promise<CallToolResult>);

  server.registerTool('da_upload_media', {
    description: 'Upload an image or media file to a site using base64-encoded data. '
      + 'When uploading images referenced in a page (e.g. during page creation or update), '
      + 'place the image in a child folder named after the page, sibling to the page file '
      + '(e.g. page at "docs/my-page.html" → image at "docs/.my-page/image.png" with the folder name with a leading dot). '
      + 'For standalone media uploads unrelated to a specific page, use the "media" folder '
      + '(e.g. "media/image.png").',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Site / Repository name'),
      path: z.string().describe(
        'Destination path for the media file. '
        + 'For page-related images use a dot-prefixed folder named after the page: "docs/.my-page/image.png". '
        + 'For standalone uploads use the media folder: "media/image.png".',
      ),
      base64Data: z.string().describe('Base64-encoded file content'),
      mimeType: z.string().describe('MIME type of the file (e.g., "image/png", "image/jpeg")'),
      fileName: z.string().describe('Original filename including extension (e.g., "photo.jpg")'),
    }),
    annotations: { readOnlyHint: false, idempotentHint: true },
  }, (args) => handleUploadMedia(client, args) as Promise<CallToolResult>);

  server.registerTool('da_preview_content', {
    description: 'Preview a document, publishing it to the AEM Edge Delivery preview environment. '
      + 'Simple (non-bulk) preview only.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Site / Repository name'),
      path: z.string().describe('Path to the page to preview. Any file extension (e.g. ".html") is stripped automatically, since preview URLs never include one.'),
    }),
    annotations: { readOnlyHint: false, idempotentHint: true },
  }, (args) => handlePreviewContent(client, args) as Promise<CallToolResult>);

  server.registerTool('da_unpreview_content', {
    description: 'Remove a document\'s preview from the AEM Edge Delivery preview environment.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Site / Repository name'),
      path: z.string().describe('Path to the page to unpreview. Any file extension (e.g. ".html") is stripped automatically, since preview URLs never include one.'),
    }),
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: true },
  }, (args) => handleUnpreviewContent(client, args) as Promise<CallToolResult>);

  server.registerTool('da_publish_content', {
    description: 'Publish a document to the AEM Edge Delivery live environment. '
      + 'Simple (non-bulk) publish only.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Site / Repository name'),
      path: z.string().describe('Path to the page to publish. Any file extension (e.g. ".html") is stripped automatically, since live URLs never include one.'),
    }),
    annotations: { readOnlyHint: false, idempotentHint: true },
  }, (args) => handlePublishContent(client, args) as Promise<CallToolResult>);

  server.registerTool('da_unpublish_content', {
    description: 'Remove a document from the AEM Edge Delivery live environment (unpublish).',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Site / Repository name'),
      path: z.string().describe('Path to the page to unpublish. Any file extension (e.g. ".html") is stripped automatically, since live URLs never include one.'),
    }),
    annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: true },
  }, (args) => handleUnpublishContent(client, args) as Promise<CallToolResult>);

  return server;
}
