/**
 * MCP Tool Handlers
 * Business logic for each MCP tool
 */

import { DAAdminClient } from '../da-admin/client';
import { DAAPIError } from '../da-admin/types';
import { normalizePath, normalizePagePath } from '../utils/path';

/**
 * Format error for MCP client
 */
function formatError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const daError = error as DAAPIError;
    return `DA Admin API Error (${daError.status}): ${daError.message}${
      daError.details ? `\n${JSON.stringify(daError.details, null, 2)}` : ''
    }`;
  }

  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  return `Unknown error: ${String(error)}`;
}

/**
 * Handler for da_list_sources tool
 */
export async function handleListSources(
  client: DAAdminClient,
  args: { org: string; repo: string; path?: string },
) {
  try {
    const normalizedPath = normalizePath(args.path || '') || '';
    const response = await client.listSources(args.org, args.repo, normalizedPath);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatError(error),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handler for da_get_source tool
 */
export async function handleGetSource(
  client: DAAdminClient,
  args: { org: string; repo: string; path: string },
) {
  try {
    const normalizedPath = normalizePagePath(args.path)!;
    const response = await client.getSource(args.org, args.repo, normalizedPath);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatError(error),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handler for da_create_source tool
 */
export async function handleCreateSource(
  client: DAAdminClient,
  args: { org: string; repo: string; path: string; content: string; contentType?: string },
) {
  try {
    const normalizedPath = normalizePagePath(args.path)!;
    const response = await client.createSource(
      args.org,
      args.repo,
      normalizedPath,
      args.content,
      args.contentType,
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatError(error),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handler for da_update_source tool
 */
export async function handleUpdateSource(
  client: DAAdminClient,
  args: { org: string; repo: string; path: string; content: string; contentType?: string },
) {
  try {
    const normalizedPath = normalizePagePath(args.path)!;
    const response = await client.updateSource(
      args.org,
      args.repo,
      normalizedPath,
      args.content,
      args.contentType,
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatError(error),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handler for da_delete_source tool
 */
export async function handleDeleteSource(
  client: DAAdminClient,
  args: { org: string; repo: string; path: string },
) {
  try {
    const normalizedPath = normalizePagePath(args.path)!;
    const response = await client.deleteSource(args.org, args.repo, normalizedPath);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatError(error),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handler for da_copy_content tool
 */
export async function handleCopyContent(
  client: DAAdminClient,
  args: { org: string; repo: string; sourcePath: string; destinationPath: string },
) {
  try {
    const normalizedSourcePath = normalizePagePath(args.sourcePath)!;
    const normalizedDestinationPath = normalizePagePath(args.destinationPath)!;
    const response = await client.copyContent(
      args.org,
      args.repo,
      normalizedSourcePath,
      normalizedDestinationPath,
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatError(error),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handler for da_move_content tool
 */
export async function handleMoveContent(
  client: DAAdminClient,
  args: { org: string; repo: string; sourcePath: string; destinationPath: string },
) {
  try {
    const normalizedSourcePath = normalizePagePath(args.sourcePath)!;
    const normalizedDestinationPath = normalizePagePath(args.destinationPath)!;
    const response = await client.moveContent(
      args.org,
      args.repo,
      normalizedSourcePath,
      normalizedDestinationPath,
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatError(error),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handler for da_get_versions tool
 */
export async function handleGetVersions(
  client: DAAdminClient,
  args: { org: string; repo: string; path: string },
) {
  try {
    const normalizedPath = normalizePagePath(args.path)!;
    const response = await client.getVersions(args.org, args.repo, normalizedPath);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatError(error),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handler for da_lookup_media tool
 */
export async function handleLookupMedia(
  client: DAAdminClient,
  args: { org: string; repo: string; mediaPath: string },
) {
  try {
    const normalizedMediaPath = normalizePath(args.mediaPath)!;
    const response = await client.lookupMedia(args.org, args.repo, normalizedMediaPath);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatError(error),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handler for da_lookup_fragment tool
 */
export async function handleLookupFragment(
  client: DAAdminClient,
  args: { org: string; repo: string; fragmentPath: string },
) {
  try {
    const normalizedFragmentPath = normalizePath(args.fragmentPath)!;
    const response = await client.lookupFragment(args.org, args.repo, normalizedFragmentPath);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatError(error),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handler for da_upload_media tool
 * Uploads images and media files to DA repository
 */
export async function handleUploadMedia(
  client: DAAdminClient,
  args: {
    org: string;
    repo: string;
    path: string;
    base64Data: string;
    mimeType: string;
    fileName: string;
  },
) {
  try {
    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    let cleanBase64 = args.base64Data;
    if (cleanBase64.includes(',')) {
      [, cleanBase64] = cleanBase64.split(',');
    }

    const response = await client.uploadMedia(
      args.org,
      args.repo,
      args.path,
      cleanBase64,
      args.mimeType,
      args.fileName,
    );

    // Return success with the media path for reference
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: `Media uploaded successfully to ${args.path}`,
            path: args.path,
            fileName: args.fileName,
            mimeType: args.mimeType,
            ...response,
          }, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: formatError(error),
        },
      ],
      isError: true,
    };
  }
}
