import http from 'node:http';
import { WebSocketServer } from 'ws';
import { Bot } from 'grammy';
import { normalizePathForPlatform } from '../utils/platform.js';
import { OpenArvaAgent } from '../engine/agent.js';
import { listTasks } from './state.js';

const agent = new OpenArvaAgent();

function isAuthorized(req: http.IncomingMessage) {
  const secret = process.env.OPENARVA_AUTH_KEY;
  return !secret || req.headers.authorization === `Bearer ${secret}`;
}

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readJson(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = '';
    let rejected = false;
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      if (rejected) return;
      body += chunk;
      if (body.length > 64 * 1024) {
        rejected = true;
        reject(new Error('Request body is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (rejected) return;
      try {
        resolve(JSON.parse(body || '{}') as Record<string, unknown>);
      } catch {
        reject(new Error('Request body must be valid JSON.'));
      }
    });
    req.on('error', reject);
  });
}

function dashboardHtml() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OpenArva Dashboard</title><style>:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#102a2e;color:#effcf8}body{max-width:960px;margin:0 auto;padding:32px}h1{color:#ffd166}main{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}.panel{border:1px solid #2e6665;border-radius:12px;padding:20px;background:#153b3f}textarea{width:100%;min-height:110px;box-sizing:border-box;background:#0c2023;color:inherit;border:1px solid #3b7773;border-radius:8px;padding:12px}button{margin-top:10px;padding:10px 16px;border:0;border-radius:8px;background:#16b8a6;color:#062225;font-weight:700;cursor:pointer}#answer{white-space:pre-wrap;line-height:1.5;color:#d7eee9}</style></head><body><h1>OpenArva Dashboard</h1><p>Personal AI gateway control panel</p><main><section class="panel"><h2>Ask OpenArva</h2><textarea id="prompt" placeholder="What should OpenArva help with?"></textarea><button onclick="ask()">Send request</button><p id="answer"></p></section><section class="panel"><h2>Gateway status</h2><p id="status">Loading...</p><h2>Recent tasks</h2><pre id="tasks">Loading...</pre></section></main><script>async function load(){const r=await fetch('/api/status');const d=await r.json();document.querySelector('#status').textContent=d.status+' | '+d.platform;document.querySelector('#tasks').textContent=(d.tasks||[]).map(t=>t.status+' '+t.title).join('\n')||'No tasks yet'}async function ask(){const p=document.querySelector('#prompt').value.trim();if(!p)return;document.querySelector('#answer').textContent='Thinking...';const r=await fetch('/api/v1/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:p})});const d=await r.json();document.querySelector('#answer').textContent=d.response||d.error;load()}load()</script></body></html>`;
}

function maybeStartTelegramGateway() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return;
  }

  const bot = new Bot(token);

  bot.command('start', async (ctx) => {
    await ctx.reply('OpenArva mobile gateway is online. Send any message and it will be relayed to the local OpenArva server.');
  });

  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    await ctx.reply(await agent.respond(text));
  });

  bot.start().catch((error: unknown) => {
    console.error(`Telegram Bot Gateway unavailable: ${error instanceof Error ? error.message : 'authentication failed'}`);
  });
  console.log('Telegram Bot Gateway: active via TELEGRAM_BOT_TOKEN');
}

export async function serveCommand(port = 3000) {
  const resolvedPort = Number(port || 3000);
  if (!Number.isInteger(resolvedPort) || resolvedPort < 1 || resolvedPort > 65535) {
    throw new Error(`Invalid port: ${port}. Expected an integer from 1 to 65535.`);
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/dashboard') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(dashboardHtml());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, {
        ok: true,
        service: 'openarva',
        platform: process.platform,
        status: 'healthy',
      });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/status') {
      sendJson(res, 200, {
        ok: true,
        service: 'openarva',
        message: 'OpenArva personal AI agent is running.',
        status: 'healthy',
        normalizedPath: normalizePathForPlatform(process.cwd()),
        tasks: listTasks().slice(-10),
        gateway: {
          dashboard: '/dashboard',
          websocket: `ws://localhost:${resolvedPort}/ws`,
          telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN) ? 'configured' : 'not configured',
        },
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/v1/chat') {
      if (!isAuthorized(req)) {
        sendJson(res, 401, { ok: false, error: 'Unauthorized' });
        return;
      }
      try {
        const data = await readJson(req);
        const prompt = typeof data.prompt === 'string' ? data.prompt.trim() : '';
        if (!prompt) {
          sendJson(res, 400, { ok: false, error: 'prompt is required' });
          return;
        }
        const response = await agent.respond(prompt);
        sendJson(res, 200, { ok: true, response, timestamp: new Date().toISOString() });
      } catch (error) {
        sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      }
      return;
    }

    sendJson(res, 404, { ok: false, error: 'Not found' });
  });

  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket, request) => {
    if (!isAuthorized(request)) {
      socket.close(1008, 'Unauthorized');
      return;
    }
    socket.send(JSON.stringify({
      type: 'status',
      message: 'Connected to OpenArva gateway',
      platform: process.platform,
    }));

    socket.on('message', async (message) => {
      const stringMessage = message.toString();
      try {
        const data = JSON.parse(stringMessage);
        const prompt = typeof data.prompt === 'string' ? data.prompt.trim() : '';
        if (!prompt) {
          socket.send(JSON.stringify({ type: 'error', error: 'prompt is required' }));
          return;
        }
        socket.send(JSON.stringify({
          type: 'response',
          response: await agent.respond(prompt, String(data.domain || 'coding') as Parameters<typeof agent.respond>[1]),
        }));
      } catch {
        socket.send(JSON.stringify({
          type: 'text',
          message: stringMessage,
        }));
      }
    });
  });

  maybeStartTelegramGateway();

  server.listen(resolvedPort, () => {
    console.log(`OpenArva serve is listening on http://localhost:${resolvedPort}`);
    console.log(`WebSocket gateway ready at ws://localhost:${resolvedPort}/ws`);
    if (process.env.TELEGRAM_BOT_TOKEN) {
      console.log('Telegram Bot Gateway: configured via TELEGRAM_BOT_TOKEN');
    } else {
      console.log('Telegram Bot Gateway: not configured yet — set TELEGRAM_BOT_TOKEN to enable remote phone interaction.');
    }
  });
}
