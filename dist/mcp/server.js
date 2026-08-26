// The SDK is provided by the application's runtime dependency graph.
// @ts-expect-error The SDK package may not be visible to the current TypeScript project configuration.
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// @ts-expect-error The SDK package may not be visible to the current TypeScript project configuration.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
export class OpenArvaMCPServer {
    server;
    constructor() {
        this.server = new Server({ name: 'openarva-mcp-server', version: '15.4.0' }, { capabilities: { tools: {} } });
    }
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.log('[OpenArva MCP] Protocol Server Active over Stdio');
    }
}
