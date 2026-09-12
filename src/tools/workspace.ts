import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dirname } from 'node:path';
import chalk from 'chalk';
import { confirmExecutionApproval } from '../commands/state.js';
import { parseSafeCommand, runSandboxedCommandDetailed } from '../engine/sandbox.js';

function assertWorkspacePath(filePath: string, cwd = process.cwd()) {
  const root = resolve(cwd);
  const target = resolve(root, filePath);
  if (target !== root && !target.startsWith(`${root}${process.platform === 'win32' ? '\\' : '/'}`)) throw new Error('Workspace path must remain inside the current project.');
  return target;
}

export function searchWorkspace(query: string, cwd = process.cwd()) {
  const pattern = new RegExp(query, 'i');
  const results: string[] = [];
  const ignored = new Set(['node_modules', '.git', 'dist']);
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) { try { const content = readFileSync(path, 'utf8'); if (pattern.test(content)) results.push(path); } catch { /* binary/unreadable file */ } }
    }
  };
  walk(resolve(cwd));
  return results;
}

export async function editWorkspaceFile(filePath: string, content: string, cwd = process.cwd(), autoApprove = false) {
  const target = assertWorkspacePath(filePath, cwd);
  const before = existsSync(target) ? readFileSync(target, 'utf8') : '';
  console.log(chalk.cyan.bold('Diff Preview'));
  if (before) console.log(chalk.red(before.split(/\r?\n/).map((line) => `- ${line}`).join('\n')));
  if (content) console.log(chalk.green(content.split(/\r?\n/).map((line) => `+ ${line}`).join('\n')));
  if (!await confirmExecutionApproval(`modify ${target}`, autoApprove)) return false;
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
  return true;
}

export async function executeWorkspaceCommand(input: string, cwd = process.cwd(), autoApprove = false) {
  if (!await confirmExecutionApproval(`run workspace command: ${input}`, autoApprove)) {
    return { ok: false, cancelled: true, stdout: '', stderr: 'Execution cancelled by user.' };
  }
  const parsed = parseSafeCommand(input);
  const result = await runSandboxedCommandDetailed(parsed.command, parsed.args, resolve(cwd));
  return result;
}
