import 'dotenv/config';
import { createServer } from 'node:http';
const port = Number(process.env.PORT ?? 3000);
const escapeXml = (value) => value
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
        let reply;
        if (command === 'hello' || command === 'hi') {
            reply = 'Hello! I am the OpenArva WhatsApp bot. How can I help you?';
        }
        else if (command === 'help') {
            reply =
                'Available commands:\n' +
                    'hello - Get a greeting\n' +
                    'status - Check bot status\n' +
                    'help - Show this help message';
        }
        else if (command === 'status') {
            reply = 'OpenArva WhatsApp bot is running successfully.';
        }
        else if (!message) {
            reply = 'Please send a message. Type "help" to see available commands.';
        }
        else {
            reply =
                `You sent: ${message}\n\n` +
                    'I do not understand that command. Type "help" for assistance.';
        }
        const xmlResponse = '<?xml version="1.0" encoding="UTF-8"?>' +
            `<Response><Message>${escapeXml(reply).replaceAll('\n', '&#10;')}</Message></Response>`;
        res.writeHead(200, {
            'Content-Type': 'text/xml; charset=utf-8',
        });
        res.end(xmlResponse);
    });
});
server.listen(port, () => {
    console.log(`OpenArva WhatsApp bot is running on port ${port}`);
});
