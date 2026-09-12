import { describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { handleEnterpriseWebhook, verifyWebhookSignature } from './webhook.js';

describe('enterprise webhooks', () => {
  it('verifies signatures and sanitizes payloads before handling', async () => {
    const secret = 'test-secret';
    const body = JSON.stringify({ card: '4111111111111111' });
    const signature = createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyWebhookSignature(body, signature, secret)).toBe(true);
    const response = await handleEnterpriseWebhook({ method: 'POST', path: '/core-banking', headers: { 'content-type': 'application/json', 'x-openarva-signature': signature }, body, role: 'operator', actor: 'test-agent' }, { secret, requiredPermission: 'customer:write', handler: async (payload) => payload });
    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).toContain('REDACTED_CREDIT_CARD');
  });
});
