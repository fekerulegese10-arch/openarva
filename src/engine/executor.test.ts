import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { executeCommandDetailed } from './executor.js';
import { parseSafeCommand, runSandboxedCommand, validateSafeCommand } from './sandbox.js';

describe('terminal execution', () => {
  it('retries a failed command and returns the successful attempt', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'openarva-executor-'));
    const marker = join(directory, 'first-attempt');
    const script = `const fs=require('node:fs'); const marker=process.argv[1]; if (!fs.existsSync(marker)) { fs.writeFileSync(marker, '1'); process.stderr.write('transient failure'); process.exit(7); } process.stdout.write('recovered');`;

    try {
      const result = await executeCommandDetailed(process.execPath, ['-e', script, marker], {
        cwd: directory,
        maxRetries: 2,
        retryDelayMs: 1,
      });

      expect(result.ok).toBe(true);
      expect(result.attempts).toBe(2);
      expect(result.stdout).toBe('recovered');
      expect(result.history[0]?.exitCode).toBe(7);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('stops after the configured retry budget', async () => {
    const result = await executeCommandDetailed(process.execPath, ['-e', 'process.stderr.write("permanent failure"); process.exit(3)'], {
      maxRetries: 2,
      retryDelayMs: 1,
    });

    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(3);
    expect(result.exitCode).toBe(3);
    expect(result.stderr).toContain('permanent failure');
  });

  it('parses quoted arguments and runs an allowed command through the retry path', async () => {
    const parsed = parseSafeCommand(`"${process.execPath}" -e "process.stdout.write('safe output')"`);
    expect(parsed.args).toContain('-e');

    const output = await runSandboxedCommand(parsed.command, parsed.args, process.cwd(), 10_000);
    expect(output).toContain('safe output');
  });

  it('rejects destructive commands before spawning a process', () => {
    expect(() => validateSafeCommand('git', ['reset', '--hard'])).toThrow('safety policy');
    expect(() => validateSafeCommand(process.execPath, ['-e', 'require("node:fs").rmSync("C:/data")'])).toThrow('safety policy');
    expect(() => validateSafeCommand('powershell', ['Remove-Item', '-Recurse', 'C:/data'])).toThrow('not allowed');
  });
});