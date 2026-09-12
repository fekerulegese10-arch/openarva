import { describe, expect, it } from 'vitest';
import { sanitizeSensitiveData } from './sanitizer.js';
import { hasPermission, requirePermission } from './auditLogger.js';

describe('enterprise security controls', () => {
  it('redacts valid payment and credential data', () => {
    const result = sanitizeSensitiveData('Card 4111 1111 1111 1111, PIN: 1234, account 1234567890');
    expect(result.text).toContain('[REDACTED_CREDIT_CARD:1111]');
    expect(result.text).toContain('[REDACTED_PIN]');
    expect(result.text).toContain('[REDACTED_BANK_ACCOUNT]');
  });

  it('enforces role permissions', () => {
    expect(hasPermission('agent', 'call:handle')).toBe(true);
    expect(hasPermission('readonly', 'payment:write')).toBe(false);
    expect(() => requirePermission('readonly', 'payment:write')).toThrow('not authorized');
  });
});
