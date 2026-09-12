// The SDK is provided by the application's runtime dependency graph.
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export class OpenArvaMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: 'openarva-mcp-server', version: '17.6.21' },
      { capabilities: { tools: {} } }
    );
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('[OpenArva MCP] Protocol Server Active over Stdio');
  }
}