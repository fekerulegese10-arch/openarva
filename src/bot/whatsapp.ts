import 'dotenv/config';
import { createServer } from 'node:http';

const port = Number(process.env.PORT ?? 3000);

const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const server = createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('OpenArva WhatsApp bot is running');
    return;
  }

  if (req.method !== 'POST' || req.url !== '/whatsapp') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  let body = '';

  req.setEncoding('utf8');

  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', () => {
    const params = new URLSearchParams(body);
    const message = String(params.get('Body') ?? '').trim();

    const command = message.toLowerCase();
    let reply: string;

    if (command === 'hello' || command === 'hi') {
      reply = '👋 Hello! I\'m OpenArva, your personal AI assistant. What can I help you with today?';
    } else if (command === 'help') {
      reply =
        '📚 OpenArva Commands:\n' +
        '• hello - Greetings\n' +
        '• help - Show commands\n' +
        '• status - System status\n' +
        '• code <task> - Code generation\n' +
        '• analyze <text> - Analysis\n' +
        '• translate <lang> - Translation\n\n' +
        '💡 Just send any question or task!';
    } else if (command === 'status') {
      reply = '🟢 OpenArva is online and operating at full capacity!';
    } else if (!message) {
      reply = 'Please send a message. Type "help" for available commands.';
    } else {
      reply =
        `📥 Received: "${message}"\n\n` +
        '🔄 Processing with OpenArva AI...\n' +
        'Type "help" for commands or just ask anything!';
    }

    const xmlResponse =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      `<Response><Message>${escapeXml(reply).replaceAll('\n', '&#10;')}</Message></Response>`;

    res.writeHead(200, {
      'Content-Type': 'text/xml; charset=utf-8',
    });

    res.end(xmlResponse);
  });
});

server.listen(port, () => {
  console.log(`\n✅ [OpenArva WhatsApp Bot] Running on port ${port}`);
  console.log(`📱 Your personal AI is ready on WhatsApp!`);
});