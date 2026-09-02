import { describe, it, expect } from 'vitest';
import { createServer } from '../../src/mcp/server';
import { IAdminClient } from '../../src/da-admin/types';

describe('createServer preview/publish tool registration', () => {
  const client = {} as unknown as IAdminClient;
  const server = createServer(client, '1.0.0');
  // _registeredTools is private on McpServer; there's no public API to list
  // registered tools without a connected transport, so we reach in directly
  // (same pragmatic `as any` pattern already used in admin-client.test.ts).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const registeredTools = (server as any)._registeredTools;

  it('registers all four preview/publish tools', () => {
    expect(Object.keys(registeredTools)).toEqual(expect.arrayContaining([
      'da_preview_content',
      'da_unpreview_content',
      'da_publish_content',
      'da_unpublish_content',
    ]));
  });

  it.each([
    'da_preview_content',
    'da_unpreview_content',
    'da_publish_content',
    'da_unpublish_content',
  ])('%s accepts org, repo, and path', (toolName) => {
    const tool = registeredTools[toolName];
    expect(Object.keys(tool.inputSchema.shape)).toEqual(['org', 'repo', 'path']);
  });

  it.each([
    'da_preview_content',
    'da_publish_content',
  ])('%s is not marked destructive', (toolName) => {
    expect(registeredTools[toolName].annotations.destructiveHint).not.toBe(true);
  });

  it.each([
    'da_unpreview_content',
    'da_unpublish_content',
  ])('%s is marked destructive and idempotent', (toolName) => {
    expect(registeredTools[toolName].annotations).toMatchObject({
      destructiveHint: true,
      idempotentHint: true,
    });
  });
});
