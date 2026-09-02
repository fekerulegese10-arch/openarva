import http from 'node:http';
import { WebSocketServer } from 'ws';
import { Bot } from 'grammy';
import { normalizePathForPlatform } from '../utils/platform.js';

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
    await ctx.reply(`OpenArva received: ${text}`);
  });

  bot.start();
  console.log('Telegram Bot Gateway: active via TELEGRAM_BOT_TOKEN');
}

export async function serveCommand(port = 3000) {
  const resolvedPort = Number(port || 3000);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        service: 'openarva',
        platform: process.platform,
        status: 'healthy',
      }));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        service: 'openarva',
        message: 'OpenArva personal AI agent is running.',
        normalizedPath: normalizePathForPlatform(process.cwd()),
        gateway: {
          websocket: `ws://localhost:${resolvedPort}/ws`,
          telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN) ? 'configured' : 'not configured',
        },
      }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      message: 'OpenArva personal AI agent is running.',
      normalizedPath: normalizePathForPlatform(process.cwd()),
      websocket: `ws://localhost:${resolvedPort}/ws`,
    }));
  });

  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({
      type: 'status',
      message: 'Connected to OpenArva gateway',
      platform: process.platform,
    }));

    socket.on('message', (message) => {
      const stringMessage = message.toString();
      try {
        const data = JSON.parse(stringMessage);
        socket.send(JSON.stringify({
          type: 'echo',
          received: data,
          service: 'openarva',
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
