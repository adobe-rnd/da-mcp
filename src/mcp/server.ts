/**
 * MCP Server Setup
 * Initialize and configure the MCP server with all tools
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { DAAdminClient } from '../da-admin/client';
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
  handleUploadMedia,
  handleLookupFragment,
  handleInspectFig,
  handleFigGetEntry,
} from './handlers';

const DEFAULT_FIG_INSPECTOR_URL = 'https://fig-inspector.franklin-prod.workers.dev';

/**
 * Create and configure MCP server with all DA tools registered
 */
export function createServer(
  client: DAAdminClient,
  version: string,
  figInspectorUrl?: string,
): McpServer {
  const server = new McpServer({ name: 'da-live-admin', version });
  const figUrl = figInspectorUrl || DEFAULT_FIG_INSPECTOR_URL;

  server.registerTool('da_list_sources', {
    description: 'List all sources and directories in a DA repository at a given path. Returns a list of files and folders with their metadata.',
    inputSchema: z.object({
      org: z.string().describe('Organization name (e.g., "adobe")'),
      repo: z.string().describe('Repository name (e.g., "my-docs")'),
      path: z.string().optional().describe('Optional path within repository (e.g., "docs/guides"). Leave empty for root.'),
    }),
  }, (args) => handleListSources(client, args) as Promise<CallToolResult>);

  server.registerTool('da_get_source', {
    description: 'Get the content of a specific source file from a DA repository. Returns the file content and metadata.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Repository name'),
      path: z.string().describe('Path to the file within the repository (e.g., "docs/index.md")'),
    }),
  }, (args) => handleGetSource(client, args) as Promise<CallToolResult>);

  server.registerTool('da_create_source', {
    description: 'Create a new source file in a DA repository with the specified content.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Repository name'),
      path: z.string().describe('Path where the new file should be created (e.g., "docs/new-page.md")'),
      content: z.string().describe('Content of the new file'),
      contentType: z.string().optional().describe('Optional content type (e.g., "text/markdown", "text/html")'),
    }),
  }, (args) => handleCreateSource(client, args) as Promise<CallToolResult>);

  server.registerTool('da_update_source', {
    description: 'Update an existing source file in a DA repository with new content.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Repository name'),
      path: z.string().describe('Path to the file to update'),
      content: z.string().describe('New content for the file'),
      contentType: z.string().optional().describe('Optional content type'),
    }),
  }, (args) => handleUpdateSource(client, args) as Promise<CallToolResult>);

  server.registerTool('da_delete_source', {
    description: 'Delete a source file from a DA repository. Use with caution as this operation cannot be undone.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Repository name'),
      path: z.string().describe('Path to the file to delete'),
    }),
  }, (args) => handleDeleteSource(client, args) as Promise<CallToolResult>);

  server.registerTool('da_copy_content', {
    description: 'Copy content from one location to another within a DA repository. Creates a duplicate of the source at the destination.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Repository name'),
      sourcePath: z.string().describe('Path to the source file to copy from'),
      destinationPath: z.string().describe('Path where the file should be copied to'),
    }),
  }, (args) => handleCopyContent(client, args) as Promise<CallToolResult>);

  server.registerTool('da_move_content', {
    description: 'Move content from one location to another within a DA repository. The source file will be removed.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Repository name'),
      sourcePath: z.string().describe('Path to the source file to move from'),
      destinationPath: z.string().describe('Path where the file should be moved to'),
    }),
  }, (args) => handleMoveContent(client, args) as Promise<CallToolResult>);

  server.registerTool('da_get_versions', {
    description: 'Get version history for a source file in a DA repository. Returns a list of versions with timestamps and metadata.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Repository name'),
      path: z.string().describe('Path to the file'),
    }),
  }, (args) => handleGetVersions(client, args) as Promise<CallToolResult>);

  server.registerTool('da_lookup_media', {
    description: 'Lookup media references in a DA repository. Returns information about media assets including URLs and metadata.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Repository name'),
      mediaPath: z.string().describe('Path to the media file'),
    }),
  }, (args) => handleLookupMedia(client, args) as Promise<CallToolResult>);

  server.registerTool('da_lookup_fragment', {
    description: 'Lookup fragment references in a DA repository. Returns information about content fragments.',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Repository name'),
      fragmentPath: z.string().describe('Path to the fragment'),
    }),
  }, (args) => handleLookupFragment(client, args) as Promise<CallToolResult>);

  server.registerTool('da_upload_media', {
    description: 'Upload an image or media file to a DA repository using base64-encoded data. '
      + 'When uploading images referenced in a page (e.g. during page creation or update), '
      + 'place the image in a child folder named after the page, sibling to the page file '
      + '(e.g. page at "docs/my-page.html" → image at "docs/.my-page/image.png" with the folder name with a leading dot). '
      + 'For standalone media uploads unrelated to a specific page, use the "media" folder '
      + '(e.g. "media/image.png").',
    inputSchema: z.object({
      org: z.string().describe('Organization name'),
      repo: z.string().describe('Repository name'),
      path: z.string().describe(
        'Destination path for the media file. '
        + 'For page-related images use a dot-prefixed folder named after the page: "docs/.my-page/image.png". '
        + 'For standalone uploads use the media folder: "media/image.png".',
      ),
      base64Data: z.string().describe('Base64-encoded file content'),
      mimeType: z.string().describe('MIME type of the file (e.g., "image/png", "image/jpeg")'),
      fileName: z.string().describe('Original filename including extension (e.g., "photo.jpg")'),
    }),
  }, (args) => handleUploadMedia(client, args) as Promise<CallToolResult>);

  server.registerTool('inspect_fig', {
    description: 'Parse a Figma .fig file offline (no Figma token) and return its structure: '
      + 'recovered text runs, design tokens, the image asset list, a preview thumbnail (base64), '
      + 'and canvas metadata. Provide the .fig either inline as base64 (figBase64) or as a fetchable '
      + 'URL (sourceUrl). Use this as the first step of converting a Figma design into an EDS landing page.',
    inputSchema: z.object({
      figBase64: z.string().optional().describe('Base64-encoded .fig file bytes. Provide this OR sourceUrl.'),
      sourceUrl: z.string().optional().describe('URL to fetch the .fig from. Provide this OR figBase64.'),
    }),
  }, (args) => handleInspectFig(figUrl, args) as Promise<CallToolResult>);

  server.registerTool('fig_get_entry', {
    description: 'Fetch one asset from a .fig by name (e.g. "thumbnail.png" or an "images/<hash>" '
      + 'entry from inspect_fig output), returned as an image. Provide the .fig via figBase64 or sourceUrl.',
    inputSchema: z.object({
      name: z.string().describe('Entry name, e.g. "thumbnail.png" or "images/<hash>".'),
      figBase64: z.string().optional().describe('Base64-encoded .fig file bytes. Provide this OR sourceUrl.'),
      sourceUrl: z.string().optional().describe('URL to fetch the .fig from. Provide this OR figBase64.'),
    }),
  }, (args) => handleFigGetEntry(figUrl, args) as Promise<CallToolResult>);

  return server;
}
