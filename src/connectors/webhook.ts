import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { auditEnterpriseEvent, requirePermission, type EnterpriseRole } from '../security/auditLogger.js';
import { sanitizeSensitiveData } from '../security/sanitizer.js';

export interface WebhookRequest { method: string; path: string; headers: Record<string, string | undefined>; body: string; role: EnterpriseRole; actor: string; }
export interface WebhookResponse { status: number; body: Record<string, unknown>; }

export function verifyWebhookSignature(body: string, signature: string | undefined, secret: string) {
  if (!signature || !secret) return false;
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const supplied = signature.replace(/^sha256=/i, '');
  const left = Buffer.from(expected, 'utf8');
  const right = Buffer.from(supplied, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}

export function parseWebhookBody(body: string, contentType = ''): Record<string, unknown> {
  if (contentType.includes('application/json')) return JSON.parse(body) as Record<string, unknown>;
  return Object.fromEntries(new URLSearchParams(body).entries());
}

export async function handleEnterpriseWebhook(request: WebhookRequest, options: { secret: string; handler: (payload: Record<string, unknown>) => Promise<unknown>; requiredPermission?: 'customer:read' | 'customer:write' | 'payment:read' | 'payment:write' }) : Promise<WebhookResponse> {
  try {
    if (request.method !== 'POST') return { status: 405, body: { ok: false, error: 'Method not allowed' } };
    if (!verifyWebhookSignature(request.body, request.headers['x-openarva-signature'] || request.headers['x-hub-signature-256'], options.secret)) return { status: 401, body: { ok: false, error: 'Invalid signature' } };
    if (options.requiredPermission) requirePermission(request.role, options.requiredPermission);
    const payload = parseWebhookBody(request.body, request.headers['content-type']);
    const safePayload = JSON.parse(sanitizeSensitiveData(JSON.stringify(payload)).text) as Record<string, unknown>;
    const result = await options.handler(safePayload);
    auditEnterpriseEvent({ action: `webhook:${request.path}`, actor: request.actor, role: request.role, outcome: 'allowed', details: { keys: Object.keys(payload) } });
    return { status: 200, body: { ok: true, result } };
  } catch (error) {
    auditEnterpriseEvent({ action: `webhook:${request.path}`, actor: request.actor, role: request.role, outcome: 'error', details: { error: error instanceof Error ? error.message : String(error) } });
    return { status: 400, body: { ok: false, error: error instanceof Error ? error.message : String(error) } };
  }
}

export function readHttpWebhook(req: IncomingMessage, maxBytes = 64 * 1024) {
  return new Promise<string>((resolve, reject) => { let body = ''; req.setEncoding('utf8'); req.on('data', (chunk: string) => { body += chunk; if (body.length > maxBytes) { reject(new Error('Webhook body too large.')); req.destroy(); } }); req.on('end', () => resolve(body)); req.on('error', reject); });
}

export function writeWebhookResponse(res: ServerResponse, response: WebhookResponse) { res.writeHead(response.status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(response.body)); }
