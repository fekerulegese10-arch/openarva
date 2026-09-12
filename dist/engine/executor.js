import { spawn } from 'node:child_process';
function clampPositive(value, fallback) {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function runAttempt(command, args, options, attempt) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
        let child;
        try {
            child = spawn(command, args, {
                cwd: options.cwd,
                env: options.env,
                shell: options.shell,
                windowsHide: true,
                stdio: ['ignore', 'pipe', 'pipe'],
            });
        }
        catch (error) {
            reject(error);
            return;
        }
        let stdout = '';
        let stderr = '';
        let timedOut = false;
        const append = (current, chunk) => `${current}${chunk.toString()}`.slice(-options.maxOutputBytes);
        const timer = setTimeout(() => {
            timedOut = true;
            child.kill();
        }, options.timeoutMs);
        child.stdout?.on('data', (chunk) => { stdout = append(stdout, chunk); });
        child.stderr?.on('data', (chunk) => { stderr = append(stderr, chunk); });
        child.once('error', (error) => {
            clearTimeout(timer);
            reject(error);
        });
        child.once('close', (exitCode, signal) => {
            clearTimeout(timer);
            resolve({ attempt, exitCode, signal, stdout, stderr, timedOut, durationMs: Date.now() - started });
        });
    });
}
export async function executeCommandDetailed(command, args = [], options = {}) {
    if (!command.trim())
        throw new Error('A command is required.');
    const maxRetries = Math.min(clampPositive(options.maxRetries, 0), 5);
    const retryDelayMs = clampPositive(options.retryDelayMs, 250);
    const runOptions = {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        timeoutMs: clampPositive(options.timeoutMs, 120_000),
        maxOutputBytes: clampPositive(options.maxOutputBytes, 200_000),
        shell: options.shell ?? false,
    };
    const history = [];
    let currentCommand = command;
    let currentArgs = [...args];
    for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
        const result = await runAttempt(currentCommand, currentArgs, runOptions, attempt);
        history.push(result);
        if (result.exitCode === 0 && !result.timedOut) {
            return { command: currentCommand, args: currentArgs, ok: true, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode, attempts: attempt, history };
        }
        if (attempt <= maxRetries) {
            const repair = options.repair ? await options.repair(result) : undefined;
            if (repair?.command)
                currentCommand = repair.command;
            if (repair?.args)
                currentArgs = repair.args;
            await wait(retryDelayMs * attempt);
        }
    }
    const last = history[history.length - 1];
    return { command: currentCommand, args: currentArgs, ok: false, stdout: last.stdout, stderr: last.stderr, exitCode: last.exitCode, attempts: history.length, history };
}
export async function executeCommandText(command, args = [], options = {}) {
    const result = await executeCommandDetailed(command, args, options);
    if (!result.ok) {
        const reason = result.history.at(-1)?.timedOut ? 'timed out' : `exited with code ${result.exitCode ?? 'unknown'}`;
        throw new Error(`Command ${reason} after ${result.attempts} attempt(s): ${result.stderr || result.stdout}`);
    }
    return result.stdout || result.stderr;
}
export async function executeCommand(command, args = [], options = {}) {
    return executeCommandText(command, args, options);
}
