/**
 * MCP Tool Definitions
 * Define all available tools for DA Live Admin operations
 */

export const tools = [
  {
    name: 'da_list_sources',
    description:
      'List all sources and directories in a DA repository at a given path. Returns a list of files and folders with their metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        org: {
          type: 'string',
          description: 'Organization name (e.g., "adobe")',
        },
        repo: {
          type: 'string',
          description: 'Repository name (e.g., "my-docs")',
        },
        path: {
          type: 'string',
          description: 'Optional path within repository (e.g., "docs/guides"). Leave empty for root.',
        },
      },
      required: ['org', 'repo'],
    },
  },
  {
    name: 'da_get_source',
    description:
      'Get the content of a specific source file from a DA repository. Returns the file content and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        org: {
          type: 'string',
          description: 'Organization name',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        path: {
          type: 'string',
          description: 'Path to the file within the repository (e.g., "docs/index.md")',
        },
      },
      required: ['org', 'repo', 'path'],
    },
  },
  {
    name: 'da_create_source',
    description:
      'Create a new source file in a DA repository with the specified content.',
    inputSchema: {
      type: 'object',
      properties: {
        org: {
          type: 'string',
          description: 'Organization name',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        path: {
          type: 'string',
          description: 'Path where the new file should be created (e.g., "docs/new-page.md")',
        },
        content: {
          type: 'string',
          description: 'Content of the new file',
        },
        contentType: {
          type: 'string',
          description: 'Optional content type (e.g., "text/markdown", "text/html")',
        },
      },
      required: ['org', 'repo', 'path', 'content'],
    },
  },
  {
    name: 'da_update_source',
    description:
      'Update an existing source file in a DA repository with new content.',
    inputSchema: {
      type: 'object',
      properties: {
        org: {
          type: 'string',
          description: 'Organization name',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        path: {
          type: 'string',
          description: 'Path to the file to update',
        },
        content: {
          type: 'string',
          description: 'New content for the file',
        },
        contentType: {
          type: 'string',
          description: 'Optional content type',
        },
      },
      required: ['org', 'repo', 'path', 'content'],
    },
  },
  {
    name: 'da_delete_source',
    description:
      'Delete a source file from a DA repository. Use with caution as this operation cannot be undone.',
    inputSchema: {
      type: 'object',
      properties: {
        org: {
          type: 'string',
          description: 'Organization name',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        path: {
          type: 'string',
          description: 'Path to the file to delete',
        },
      },
      required: ['org', 'repo', 'path'],
    },
  },
  {
    name: 'da_copy_content',
    description:
      'Copy content from one location to another within a DA repository. Creates a duplicate of the source at the destination.',
    inputSchema: {
      type: 'object',
      properties: {
        org: {
          type: 'string',
          description: 'Organization name',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        sourcePath: {
          type: 'string',
          description: 'Path to the source file to copy from',
        },
        destinationPath: {
          type: 'string',
          description: 'Path where the file should be copied to',
        },
      },
      required: ['org', 'repo', 'sourcePath', 'destinationPath'],
    },
  },
  {
    name: 'da_move_content',
    description:
      'Move content from one location to another within a DA repository. The source file will be removed.',
    inputSchema: {
      type: 'object',
      properties: {
        org: {
          type: 'string',
          description: 'Organization name',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        sourcePath: {
          type: 'string',
          description: 'Path to the source file to move from',
        },
        destinationPath: {
          type: 'string',
          description: 'Path where the file should be moved to',
        },
      },
      required: ['org', 'repo', 'sourcePath', 'destinationPath'],
    },
  },
  {
    name: 'da_get_versions',
    description:
      'Get version history for a source file in a DA repository. Returns a list of versions with timestamps and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        org: {
          type: 'string',
          description: 'Organization name',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        path: {
          type: 'string',
          description: 'Path to the file',
        },
      },
      required: ['org', 'repo', 'path'],
    },
  },
  {
    name: 'da_get_config',
    description:
      'Get configuration for a DA repository. Can retrieve global or path-specific configurations.',
    inputSchema: {
      type: 'object',
      properties: {
        org: {
          type: 'string',
          description: 'Organization name',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        configPath: {
          type: 'string',
          description: 'Optional specific configuration path',
        },
      },
      required: ['org', 'repo'],
    },
  },
  {
    name: 'da_update_config',
    description:
      'Update configuration for a DA repository. Can update global or path-specific configurations.',
    inputSchema: {
      type: 'object',
      properties: {
        org: {
          type: 'string',
          description: 'Organization name',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        config: {
          type: 'object',
          description: 'Configuration object to update',
        },
        configPath: {
          type: 'string',
          description: 'Optional specific configuration path',
        },
      },
      required: ['org', 'repo', 'config'],
    },
  },
  {
    name: 'da_lookup_media',
    description:
      'Lookup media references in a DA repository. Returns information about media assets including URLs and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        org: {
          type: 'string',
          description: 'Organization name',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        mediaPath: {
          type: 'string',
          description: 'Path to the media file',
        },
      },
      required: ['org', 'repo', 'mediaPath'],
    },
  },
  {
    name: 'da_lookup_fragment',
    description:
      'Lookup fragment references in a DA repository. Returns information about content fragments.',
    inputSchema: {
      type: 'object',
      properties: {
        org: {
          type: 'string',
          description: 'Organization name',
        },
        repo: {
          type: 'string',
          description: 'Repository name',
        },
        fragmentPath: {
          type: 'string',
          description: 'Path to the fragment',
        },
      },
      required: ['org', 'repo', 'fragmentPath'],
    },
  },
];
