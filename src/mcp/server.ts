/**
 * MCP Server Setup
 * Initialize and configure the MCP server with all tools
 */

import { DAAdminClient } from '../da-admin/client';
import { tools } from './tools';
import {
  handleListSources,
  handleGetSource,
  handleCreateSource,
  handleUpdateSource,
  handleDeleteSource,
  handleCopyContent,
  handleMoveContent,
  handleGetVersions,
  handleGetConfig,
  handleUpdateConfig,
  handleLookupMedia,
  handleLookupFragment,
} from './handlers';

/**
 * MCP Server class for handling JSON-RPC requests
 */
export class MCPServer {
  private client: DAAdminClient;

  constructor(apiToken: string, baseUrl?: string) {
    this.client = new DAAdminClient({
      apiToken,
      baseUrl: baseUrl || 'https://admin.da.live',
    });
  }

  /**
   * Handle a JSON-RPC request
   */
  async handleRequest(request: any): Promise<any> {
    const { method, params, id } = request;

    console.log('🔧 MCP Server: Processing method:', method);
    if (params) {
      console.log('📋 MCP Server: Method params:', JSON.stringify(params, null, 2));
    }

    try {
      let result: any;

      switch (method) {
        case 'tools/list':
          console.log('📚 MCP Server: Returning list of', tools.length, 'tools');
          result = { tools };
          break;

        case 'tools/call':
          console.log('🔨 MCP Server: Executing tool:', params?.name);
          result = await this.handleToolCall(params);
          console.log('✅ MCP Server: Tool execution completed');
          break;

        case 'initialize':
          console.log('🚀 MCP Server: Initializing connection');
          result = {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'da-live-admin',
              version: '1.0.0',
            },
          };
          break;

        default:
          console.log('❌ MCP Server: Unknown method:', method);
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`,
            },
          };
      }

      console.log('✅ MCP Server: Request handled successfully');
      return {
        jsonrpc: '2.0',
        id,
        result,
      };
    } catch (error) {
      console.error('❌ MCP Server: Error handling request:', error);
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      };
    }
  }

  /**
   * Handle tool execution
   */
  private async handleToolCall(params: any): Promise<any> {
    const { name, arguments: args } = params;

    switch (name) {
      case 'da_list_sources':
        return handleListSources(this.client, args);

      case 'da_get_source':
        return handleGetSource(this.client, args);

      case 'da_create_source':
        return handleCreateSource(this.client, args);

      case 'da_update_source':
        return handleUpdateSource(this.client, args);

      case 'da_delete_source':
        return handleDeleteSource(this.client, args);

      case 'da_copy_content':
        return handleCopyContent(this.client, args);

      case 'da_move_content':
        return handleMoveContent(this.client, args);

      case 'da_get_versions':
        return handleGetVersions(this.client, args);

      case 'da_get_config':
        return handleGetConfig(this.client, args);

      case 'da_update_config':
        return handleUpdateConfig(this.client, args);

      case 'da_lookup_media':
        return handleLookupMedia(this.client, args);

      case 'da_lookup_fragment':
        return handleLookupFragment(this.client, args);

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  }
}

/**
 * Create and configure MCP server
 */
export function createMCPServer(apiToken: string, baseUrl?: string): MCPServer {
  return new MCPServer(apiToken, baseUrl);
}
