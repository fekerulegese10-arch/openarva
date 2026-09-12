import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { spawn, type ChildProcess } from 'node:child_process';
import { OpenArvaAgent } from '../engine/agent.js';
import { WhatsAppConnector } from './whatsapp.js';
import { TelegramConnector } from './telegram.js';

export type GatewayChannel = 'telegram' | 'whatsapp' | 'sip';

export interface InboundMessage {
  channel: GatewayChannel;
  senderId: string;
  text: string;
  receivedAt: string;
  metadata?: Record<string, string>;
}

export interface OutboundMessage {
  channel: GatewayChannel;
  recipientId: string;
  text: string;
  replyTo?: InboundMessage;
}

export interface GatewayConnector {
  readonly channel: GatewayChannel;
  start(onMessage: (message: InboundMessage) => Promise<void>): Promise<void>;
  stop(): Promise<void>;
  send(message: OutboundMessage): Promise<void>;
  parseWebhook?(body: string, contentType?: string): InboundMessage | null;
}

export interface GatewayOptions {
  port?: number;
  host?: string;
  agent?: Pick<OpenArvaAgent, 'respond'>;
  connectors?: GatewayConnector[];
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      body += chunk;
      if (body.length > 64 * 1024) {
        reject(new Error('Request body is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

export class MultiChannelGateway {
  private readonly connectors = new Map<GatewayChannel, GatewayConnector>();
  private readonly agent: Pick<OpenArvaAgent, 'respond'>;
  private readonly port: number;
  private readonly host: string;
  private server: ReturnType<typeof createServer> | null = null;

  constructor(options: GatewayOptions = {}) {
    this.agent = options.agent || new OpenArvaAgent();
    this.port = options.port || Number(process.env.OPENARVA_GATEWAY_PORT || 18789);
    this.host = options.host || process.env.OPENARVA_GATEWAY_HOST || '127.0.0.1';
    for (const connector of options.connectors || [new TelegramConnector(), new WhatsAppConnector()]) {
      this.connectors.set(connector.channel, connector);
    }
  }

  async route(message: InboundMessage) {
    const text = message.text.trim();
    if (!text) return;
    const response = await this.agent.respond(text, 'coding');
    await this.send({ channel: message.channel, recipientId: message.senderId, text: response, replyTo: message });
  }

  async send(message: OutboundMessage) {
    const connector = this.connectors.get(message.channel);
    if (!connector) throw new Error(`No connector registered for ${message.channel}.`);
    await connector.send(message);
  }

  async start() {
    if (this.server) return;
    this.server = createServer((req, res) => this.handleHttp(req, res));
    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject);
      this.server?.listen(this.port, this.host, () => resolve());
    });

    try {
      for (const connector of this.connectors.values()) {
        await connector.start((message) => this.route(message));
      }
    } catch (error) {
      await this.stop();
      throw error;
    }

    console.log(`OpenArva multi-channel gateway listening on http://${this.host}:${this.port}`);
    console.log(`Channels: ${Array.from(this.connectors.keys()).join(', ') || 'none configured'}`);
  }

  async stop() {
    for (const connector of this.connectors.values()) await connector.stop();
    if (!this.server) return;
    await new Promise<void>((resolve) => this.server?.close(() => resolve()));
    this.server = null;
  }

  private async handleHttp(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url || '/', `http://${req.headers.host || `${this.host}:${this.port}`}`);
    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { ok: true, service: 'openarva-gateway', channels: Array.from(this.connectors.keys()) });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/webhooks/whatsapp') {
      const connector = this.connectors.get('whatsapp');
      if (!connector || typeof connector.parseWebhook !== 'function') {
        sendJson(res, 404, { ok: false, error: 'WhatsApp connector is disabled.' });
        return;
      }
      try {
        const body = await readBody(req);
        const message = connector.parseWebhook(body, req.headers['content-type'] || '');
        if (message) await this.route(message);
        sendJson(res, 200, { ok: true, accepted: Boolean(message) });
      } catch (error) {
        sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      }
      return;
    }

    sendJson(res, 404, { ok: false, error: 'Not found' });
  }
}

export async function runMultiChannelGateway(options: GatewayOptions = {}) {
  const gateway = new MultiChannelGateway(options);
  await gateway.start();
  const stop = () => { void gateway.stop(); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  return gateway;
}

export function startMultiChannelGatewayDetached() {
  const entry = fileURLToPath(new URL('../index.js', import.meta.url));
  const child: ChildProcess = spawn(process.execPath, [entry, 'gateway', 'daemon'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.unref();
  return child.pid;
}
