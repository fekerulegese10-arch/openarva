import { spawn } from 'node:child_process';

const positive = (value, fallback) => Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function runAttempt(command, args, options, attempt) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { cwd: options.cwd, env: options.env, shell: options.shell, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        let timedOut = false;
        const append = (current, chunk) => `${current}${chunk.toString()}`.slice(-options.maxOutputBytes);
        const timer = setTimeout(() => { timedOut = true; child.kill(); }, options.timeoutMs);
        child.stdout?.on('data', (chunk) => { stdout = append(stdout, chunk); });
        child.stderr?.on('data', (chunk) => { stderr = append(stderr, chunk); });
        child.once('error', (error) => { clearTimeout(timer); reject(error); });
        child.once('close', (exitCode, signal) => { clearTimeout(timer); resolve({ attempt, exitCode, signal, stdout, stderr, timedOut, durationMs: Date.now() - started }); });
    });
}

export async function executeCommandDetailed(command, args = [], options = {}) {
    if (!command.trim()) throw new Error('A command is required.');
    const maxRetries = Math.min(positive(options.maxRetries, 0), 5);
    const retryDelayMs = positive(options.retryDelayMs, 250);
    const runOptions = { cwd: options.cwd || process.cwd(), env: { ...process.env, ...options.env }, timeoutMs: positive(options.timeoutMs, 120000), maxOutputBytes: positive(options.maxOutputBytes, 200000), shell: options.shell ?? false };
    const history = [];
    for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
        const result = await runAttempt(command, args, runOptions, attempt);
        history.push(result);
        if (result.exitCode === 0 && !result.timedOut) return { command, args, ok: true, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode, attempts: attempt, history };
        if (attempt <= maxRetries) await delay(retryDelayMs * attempt);
    }
    const last = history[history.length - 1];
    return { command, args, ok: false, stdout: last.stdout, stderr: last.stderr, exitCode: last.exitCode, attempts: history.length, history };
}

export async function executeCommandText(command, args = [], options = {}) {
    const result = await executeCommandDetailed(command, args, options);
    if (!result.ok) throw new Error(`Command failed after ${result.attempts} attempt(s): ${result.stderr || result.stdout}`);
    return result.stdout || result.stderr;
}

export async function executeCommand(command, args = [], options = {}) {
    return executeCommandText(command, args, options);
}
