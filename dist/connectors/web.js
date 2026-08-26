import { createServer } from 'http';
// @ts-expect-error ws does not provide declarations in this project.
import { WebSocketServer } from 'ws';
export function startWebGateway(config = {}) {
    const PORT = config.port || 3000;
    const AUTH_SECRET = config.authSecret || process.env.OPENARVA_AUTH_KEY;
    // 1. የደህንነት ማረጋገጫ (Authentication Middleware)
    const authenticateRequest = (req, res) => {
        const authHeader = req.headers.authorization;
        // API Key ካልተዋቀረ ወይም ከተላከው ጋር ካልተመሳሰል ጥያቄውን ውድቅ ያደርጋል
        if (AUTH_SECRET && (!authHeader || authHeader !== `Bearer ${AUTH_SECRET}`)) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'ያልተፈቀደ መግቢያ! ትክክለኛ Authorization Bearer Token ያቅርቡ።'
            }));
            return false;
        }
        return true;
    };
    // 2. REST API Endpoint (ለ ሞባይል አፕሊኬሽኖች እና Webhooks)
    const server = createServer((req, res) => {
        if (req.method !== 'POST' || req.url !== '/api/v1/chat') {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Not found' }));
            return;
        }
        if (!authenticateRequest(req, res))
            return;
        let body = '';
        req.setEncoding('utf8');
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { prompt, domain } = JSON.parse(body || '{}');
                if (!prompt) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'prompt ማስገባት ግዴታ ነው::' }));
                    return;
                }
                // እዚህ ጋር የ OpenArva Core ኤጀንት ጥያቄውን ያስናግዳል
                const agentResponse = `[OpenArva Core Agent]: Processed "${prompt}" ${domain ? `in ${domain} domain` : ''}`;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, timestamp: new Date().toISOString(), data: agentResponse }));
            }
            catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
    });
    // 3. HTTP Server ማስነሳት
    server.listen(PORT, () => {
        console.log(`[OpenArva Security System] Secure Web Gateway running on port ${PORT}`);
    });
    // 4. Real-time WebSocket Gateway (ለ አሁናዊ ቻት)
    const wss = new WebSocketServer({ server });
    wss.on('connection', (ws) => {
        console.log('[OpenArva WS] አዲስ የ WebSocket ግንኙነት ተመስርቷል።');
        ws.on('message', (message) => {
            try {
                const payload = JSON.parse(message.toString());
                // WebSocket Token Check
                if (AUTH_SECRET && payload.token !== AUTH_SECRET) {
                    ws.send(JSON.stringify({ error: 'Unauthorized WebSocket Connection' }));
                    return ws.close();
                }
                ws.send(JSON.stringify({
                    status: 'success',
                    response: `[OpenArva WS Agent]: Response to "${payload.prompt || message}"`
                }));
            }
            catch (err) {
                ws.send(JSON.stringify({ error: 'Invalid message format' }));
            }
        });
    });
}
