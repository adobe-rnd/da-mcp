/**
 * MCP Tool Handlers
 * Business logic for each MCP tool
 */

import { DAAPIError, IAdminClient } from '../da-admin/types';
import { normalizePath, normalizePagePath, stripFileExtension } from '../utils/path';

/**
 * Format error for MCP client
 */
function formatError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const daError = error as DAAPIError;
    const label = {
      'da-admin': 'DA Admin API Error',
      'aem-admin': 'AEM Admin API Error',
    }[daError.backend as string] || 'Admin API Error';
    return `${label} (${daError.status}): ${daError.message}${
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
  client: IAdminClient,
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
  client: IAdminClient,
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
  client: IAdminClient,
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
  client: IAdminClient,
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
  client: IAdminClient,
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
  client: IAdminClient,
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
  client: IAdminClient,
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
  client: IAdminClient,
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
 * Handler for da_create_version tool
 */
export async function handleCreateVersion(
  client: IAdminClient,
  args: { org: string; repo: string; path: string; label?: string },
) {
  try {
    const normalizedPath = normalizePagePath(args.path)!;
    const response = await client.createVersion(args.org, args.repo, normalizedPath, args.label);
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
 * Handler for da_get_version tool
 */
export async function handleGetVersion(
  client: IAdminClient,
  args: { org: string; repo: string; path: string; versionId: string },
) {
  try {
    const normalizedPath = normalizePagePath(args.path)!;
    const response = await client.getVersion(args.org, args.repo, normalizedPath, args.versionId);
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
  client: IAdminClient,
  args: { org: string; repo: string; mediaPath: string },
) {
  try {
    const normalizedMediaPath = normalizePath(args.mediaPath)!;
    const response = await client.lookupMedia(args.org, args.repo, normalizedMediaPath);

    if (response.mimeType.startsWith('image/')) {
      return {
        content: [
          {
            type: 'image',
            data: response.data,
            mimeType: response.mimeType,
          },
        ],
      };
    }

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
  client: IAdminClient,
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

const UPLOAD_FETCH_TIMEOUT = 30000; // 30 seconds, mirrors DAAdminClient

const ALLOWED_MEDIA_MIME_TYPES = new Set([
  'image/svg+xml',
  'image/jpeg',
  'image/png',
  'image/avif',
  'image/webp',
]);

function assertAllowedMimeType(mimeType: string): void {
  if (!ALLOWED_MEDIA_MIME_TYPES.has(mimeType.toLowerCase())) {
    throw new Error(
      `Unsupported mimeType "${mimeType}". Allowed types: ${[...ALLOWED_MEDIA_MIME_TYPES].join(', ')}.`,
    );
  }
}

const MAX_MEDIA_SIZE_BYTES = 4.5 * 1024 * 1024; // 4.5MB

function assertWithinSizeLimit(byteSize: number): void {
  if (byteSize > MAX_MEDIA_SIZE_BYTES) {
    throw new Error(
      `File is too large (${byteSize} bytes). Maximum allowed size is ${MAX_MEDIA_SIZE_BYTES} bytes (4.5MB).`,
    );
  }
}

/**
 * Estimate the decoded byte size of a base64 string without fully decoding it.
 */
function estimateBase64ByteSize(base64: string): number {
  const { length } = base64;
  if (length === 0) return 0;
  let padding = 0;
  if (base64.endsWith('==')) padding = 2;
  else if (base64.endsWith('=')) padding = 1;
  return Math.floor((length * 3) / 4) - padding;
}

/**
 * Encode raw bytes to a base64 string.
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binaryStr = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binaryStr += String.fromCharCode(bytes[i]);
  }
  return btoa(binaryStr);
}

/**
 * Derive a filename from an explicit override, a source URL, or the DA path.
 */
function deriveFileName(
  override: string | undefined,
  sourceUrl: string | undefined,
  daPath: string,
): string {
  if (override && override.trim()) return override.trim();

  if (sourceUrl) {
    try {
      const { pathname } = new URL(sourceUrl);
      const urlName = pathname.split('/').filter(Boolean).pop();
      if (urlName) return urlName;
    } catch {
      // fall through to DA path derivation
    }
  }

  const pathName = daPath.split('/').filter(Boolean).pop();
  return pathName || 'upload';
}

/**
 * Fetch binary content from a public URL, returning base64 data and MIME type.
 */
async function fetchMediaFromUrl(
  sourceUrl: string,
  mimeTypeOverride: string | undefined,
): Promise<{ base64Data: string; mimeType: string; byteSize: number }> {
  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new Error(`Invalid sourceUrl: ${sourceUrl}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported URL scheme "${parsed.protocol}". Only http and https are allowed.`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_FETCH_TIMEOUT);

  try {
    const response = await fetch(sourceUrl, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Failed to fetch sourceUrl (${response.status} ${response.statusText})`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      assertWithinSizeLimit(Number(contentLength));
    }

    const contentType = response.headers.get('content-type');
    const mimeType = (mimeTypeOverride
      || (contentType ? contentType.split(';')[0].trim() : '')
      || 'application/octet-stream');

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    assertWithinSizeLimit(bytes.length);

    return { base64Data: bytesToBase64(bytes), mimeType, byteSize: bytes.length };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Timed out fetching sourceUrl after ${UPLOAD_FETCH_TIMEOUT}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Handler for da_upload_media tool
 * Uploads images and media files to DA repository from either base64 data
 * or a public URL (e.g. a Firefly temporary asset URL).
 */
export async function handleUploadMedia(
  client: IAdminClient,
  args: {
    org: string;
    repo: string;
    path: string;
    base64Data?: string;
    sourceUrl?: string;
    mimeType?: string;
    fileName?: string;
  },
) {
  try {
    const hasBase64 = typeof args.base64Data === 'string' && args.base64Data.length > 0;
    const hasSourceUrl = typeof args.sourceUrl === 'string' && args.sourceUrl.length > 0;

    if (hasBase64 === hasSourceUrl) {
      throw new Error(
        'Provide exactly one of "base64Data" or "sourceUrl".',
      );
    }

    let cleanBase64: string;
    let mimeType: string;
    let byteSize: number;

    if (args.mimeType) {
      assertAllowedMimeType(args.mimeType);
    }

    if (hasSourceUrl) {
      const fetched = await fetchMediaFromUrl(args.sourceUrl!, args.mimeType);
      cleanBase64 = fetched.base64Data;
      mimeType = fetched.mimeType;
      byteSize = fetched.byteSize;
    } else {
      // Remove data URL prefix if present (e.g., "data:image/png;base64,")
      cleanBase64 = args.base64Data!;
      if (cleanBase64.includes(',')) {
        [, cleanBase64] = cleanBase64.split(',');
      }
      mimeType = args.mimeType || 'application/octet-stream';
      byteSize = estimateBase64ByteSize(cleanBase64);
    }

    assertAllowedMimeType(mimeType);
    assertWithinSizeLimit(byteSize);

    const fileName = deriveFileName(args.fileName, args.sourceUrl, args.path);

    const response = await client.uploadMedia(
      args.org,
      args.repo,
      args.path,
      cleanBase64,
      mimeType,
      fileName,
    );

    // Return success with the media path for reference
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: `Media uploaded successfully to ${args.path}`,
            path: args.path,
            fileName,
            mimeType,
            byteSize,
            ...(hasSourceUrl ? { sourceUrl: args.sourceUrl } : {}),
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

/**
 * Handler for da_preview_content tool
 */
export async function handlePreviewContent(
  client: IAdminClient,
  args: { org: string; repo: string; path: string },
) {
  try {
    const normalizedPath = stripFileExtension(normalizePath(args.path)!);
    const response = await client.previewContent(args.org, args.repo, normalizedPath);
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
 * Handler for da_unpreview_content tool
 */
export async function handleUnpreviewContent(
  client: IAdminClient,
  args: { org: string; repo: string; path: string },
) {
  try {
    const normalizedPath = stripFileExtension(normalizePath(args.path)!);
    const response = await client.unpreviewContent(args.org, args.repo, normalizedPath);
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
 * Handler for da_publish_content tool
 */
export async function handlePublishContent(
  client: IAdminClient,
  args: { org: string; repo: string; path: string },
) {
  try {
    const normalizedPath = stripFileExtension(normalizePath(args.path)!);
    const response = await client.publishContent(args.org, args.repo, normalizedPath);
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
 * Handler for da_unpublish_content tool
 */
export async function handleUnpublishContent(
  client: IAdminClient,
  args: { org: string; repo: string; path: string },
) {
  try {
    const normalizedPath = stripFileExtension(normalizePath(args.path)!);
    const response = await client.unpublishContent(args.org, args.repo, normalizedPath);
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
