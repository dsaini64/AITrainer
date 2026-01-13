/**
 * Model Context Protocol (MCP) Client
 * 
 * Client-side interface for interacting with MCP tools
 * Handles tool discovery, execution, and response processing
 */

import { MCPServer, MCPRequest, MCPResponse, MCPTool } from './server'

export class MCPClient {
  private server: MCPServer

  constructor(server: MCPServer) {
    this.server = server
  }

  /**
   * List all available tools
   */
  listTools(): MCPTool[] {
    return this.server.getTools()
  }

  /**
   * Execute a tool request
   */
  async execute(request: MCPRequest): Promise<MCPResponse> {
    return await this.server.execute(request)
  }

  /**
   * Get tools in OpenAI function calling format
   */
  getOpenAITools() {
    return this.server.getOpenAITools()
  }

  /**
   * Check if a tool exists
   */
  hasTool(toolName: string): boolean {
    return this.server.getTools().some(tool => tool.name === toolName)
  }
}

// Singleton instance
let mcpClientInstance: MCPClient | null = null

export function getMCPClient(): MCPClient {
  if (!mcpClientInstance) {
    // Use dynamic import to avoid circular dependencies
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getMCPServer } = require('./server')
    mcpClientInstance = new MCPClient(getMCPServer())
  }
  return mcpClientInstance
}

