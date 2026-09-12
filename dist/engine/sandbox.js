import { executeCommandDetailed } from './executor.js';
import path from 'node:path';
const allowedCommands = new Set(['node', 'npm', 'npx', 'git', 'tsc', 'pnpm', 'yarn', 'python', 'python3']);
export function validateSafeCommand(command, args = []) {
    const executableName = path.basename(command).replace(/\.exe$/i, '').toLowerCase();
    if (!allowedCommands.has(executableName)) {
        throw new Error(`Command is not allowed: ${command}`);
    }
    const fullCommand = `${command} ${args.join(' ')}`;
    const blockedPatterns = [
        /(?:^|\s)(?:rm|del|erase|rmdir)\b.*(?:-rf|-recurse|\/s|\/q|\*|[A-Za-z]:\\|\/\s*$)/i,
        /(?:format|diskpart|shutdown|reboot|poweroff|mkfs|dd)\b/i,
        /git\s+(?:reset\s+--hard|clean\s+-[a-z]*f|checkout\s+--|restore\s+--source)/i,
        /(?:^|\s)(?:chmod|chown)\b.*(?:-R|\/|\\Windows|\\System32|\/etc|\/var)/i,
        /(?:^|\s)(?:curl|wget|invoke-webrequest)\b.*\|/i,
        /(?:node|python|python3)\b.*(?:child_process|subprocess|os\.system|exec\s*\(|fs\.rm|rmSync|shutil\.rmtree)/i,
    ];
    const blocked = blockedPatterns.find((pattern) => pattern.test(fullCommand));
    if (blocked)
        throw new Error(`Command rejected by safety policy: ${blocked}`);
    return { executableName, fullCommand };
}
export function runSandboxedCommandDetailed(command, args, cwd = process.cwd(), timeout = 120_000, repair) {
    validateSafeCommand(command, args);
    return executeCommandDetailed(command, args, { cwd, timeoutMs: timeout, maxRetries: 3, retryDelayMs: 300, repair });
}
export function runSandboxedCommand(command, args, cwd = process.cwd(), timeout = 120_000) {
    return runSandboxedCommandDetailed(command, args, cwd, timeout).then((result) => {
        if (result.ok)
            return result.stdout || result.stderr;
        throw new Error(`Sandbox execution failed (code ${result.exitCode ?? 'unknown'}): ${result.stderr || result.stdout}`);
    });
}
export function parseSafeCommand(input) {
    const tokens = input.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map((token) => token.replace(/^(['"])(.*)\1$/, '$2')) || [];
    const [command, ...args] = tokens;
    if (!command)
        throw new Error('No command provided.');
    return { command, args };
}
