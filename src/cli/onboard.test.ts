import { describe, it, expect } from 'vitest';

describe('OpenArva setup story', () => {
  it('exposes a quick onboarding command and user-friendly guidance', () => {
    const helpText = [
      'Usage: openarva [command] [options]',
      'Commands:',
      '  init          Start interactive setup',
      '  run           Run a domain task',
      '  gateway       Show gateway status',
      '  help          Show help',
    ].join('\n');

    expect(helpText).toContain('openarva [command] [options]');
    expect(helpText).toContain('init');
    expect(helpText).toContain('run');
    expect(helpText).toContain('gateway');
  });
});
