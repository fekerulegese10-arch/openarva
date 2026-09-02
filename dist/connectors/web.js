import { createServer } from 'http';
import { WebSocketServer } from 'ws';
export function startWebGateway(config = {}) {
    const PORT = config.port || Number(process.env.OPENARVA_PORT || 3000);
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
                const agentResponse = `🤖 [OpenArva Core]: Processing "${prompt}" ${domain ? `in ${domain} domain` : ''}`;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, timestamp: new Date().toISOString(), data: agentResponse }));
            }
            catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
    });
    // HTTP Server Start
    server.listen(PORT, () => {
        console.log(`🔐 [OpenArva Security] Secure gateway active on port ${PORT}`);
        console.log(`📡 WebSocket: ws://127.0.0.1:${PORT}`);
    });
    // Real-time WebSocket Gateway
    const wss = new WebSocketServer({ server });
    wss.on('connection', (ws) => {
        console.log('🔗 [OpenArva WebSocket] New connection established');
        ws.on('message', (message) => {
            try {
                const payload = JSON.parse(message.toString());
                // Security: Token verification
                if (AUTH_SECRET && payload.token !== AUTH_SECRET) {
                    ws.send(JSON.stringify({ error: '🔒 Unauthorized access denied' }));
                    return ws.close();
                }
                ws.send(JSON.stringify({
                    status: '✅ success',
                    response: `🤖 [OpenArva AI]: Processing "${payload.prompt || message}"...`
                }));
            }
            catch (err) {
                ws.send(JSON.stringify({ error: '❌ Invalid message format' }));
            }
        });
    });
}
