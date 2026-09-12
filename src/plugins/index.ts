import type { GatewayConnector } from '../connectors/gateway.js';

export interface OpenArvaToolContext {
  cwd: string;
  signal?: AbortSignal;
}

export interface OpenArvaTool<Input = Record<string, unknown>, Output = unknown> {
  name: string;
  description: string;
  execute(input: Input, context: OpenArvaToolContext): Promise<Output> | Output;
}

export interface OpenArvaPlugin {
  name: string;
  version: string;
  connectors?: GatewayConnector[];
  tools?: OpenArvaTool[];
  activate?: (api: OpenArvaPluginApi) => void | Promise<void>;
}

export interface OpenArvaPluginApi {
  registerConnector(connector: GatewayConnector): void;
  registerTool(tool: OpenArvaTool): void;
  log(message: string): void;
}

export class OpenArvaPluginRegistry {
  private readonly connectors = new Map<string, GatewayConnector>();
  private readonly tools = new Map<string, OpenArvaTool>();

  async register(plugin: OpenArvaPlugin) {
    if (!plugin.name || !plugin.version) throw new Error('A plugin requires a name and version.');
    for (const connector of plugin.connectors || []) this.registerConnector(connector);
    for (const tool of plugin.tools || []) this.registerTool(tool);
    await plugin.activate?.({
      registerConnector: (connector) => this.registerConnector(connector),
      registerTool: (tool) => this.registerTool(tool),
      log: (message) => console.log(`[plugin:${plugin.name}] ${message}`),
    });
  }

  registerConnector(connector: GatewayConnector) {
    if (this.connectors.has(connector.channel)) throw new Error(`Connector already registered: ${connector.channel}`);
    this.connectors.set(connector.channel, connector);
  }

  registerTool(tool: OpenArvaTool) {
    if (!tool.name || !tool.execute) throw new Error('A tool requires a name and execute function.');
    if (this.tools.has(tool.name)) throw new Error(`Tool already registered: ${tool.name}`);
    this.tools.set(tool.name, tool);
  }

  getConnectors() { return [...this.connectors.values()]; }
  getTools() { return [...this.tools.values()]; }
  getTool(name: string) { return this.tools.get(name); }
}

export async function loadPlugin(modulePath: string, registry = new OpenArvaPluginRegistry()) {
  const module = await import(modulePath) as { default?: OpenArvaPlugin; plugin?: OpenArvaPlugin };
  const plugin = module.default || module.plugin;
  if (!plugin) throw new Error(`Plugin ${modulePath} must export a default plugin or named plugin.`);
  await registry.register(plugin);
  return registry;
}