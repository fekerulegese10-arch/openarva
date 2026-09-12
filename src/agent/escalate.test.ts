import { describe, expect, it } from 'vitest';
import { classifyInquiry, decideEscalation, detectSupportLanguage } from './escalate.js';

describe('support escalation', () => {
  it('detects supported customer languages', () => {
    expect(detectSupportLanguage('Hello, I need help')).toBe('en');
    expect(detectSupportLanguage('Akkam jirtu, gargaarsa barbaada')).toBe('om');
    expect(detectSupportLanguage('እባክዎ እርዳኝ')).toBe('am');
  });

  it('escalates fraud alerts as critical', () => {
    const classification = classifyInquiry('There was an unauthorized transfer from my bank account');
    const decision = decideEscalation({ text: 'There was an unauthorized transfer from my bank account', classification });
    expect(decision).toMatchObject({ escalate: true, reason: 'fraud', priority: 'critical', queue: 'fraud-review' });
  });
});
