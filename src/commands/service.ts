import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { confirmExecutionApproval } from './state.js';

const execFileAsync = promisify(execFile);
const serviceName = 'OpenArva';

function serviceCommand() {
  const entry = join(dirname(dirname(fileURLToPath(import.meta.url))), 'index.js');
  return { executable: process.execPath, args: [entry, 'service', 'run'] };
}

async function installWindows() {
  const { executable, args } = serviceCommand();
  const taskCommand = `\"${executable}\" ${args.map((arg) => `\"${arg}\"`).join(' ')}`;
  await execFileAsync('schtasks.exe', ['/Create', '/TN', serviceName, '/SC', 'ONLOGON', '/TR', taskCommand, '/F']);
  return 'Windows Task Scheduler entry installed for ONLOGON.';
}

function installSystemd() {
  const { executable, args } = serviceCommand();
  const directory = join(homedir(), '.config', 'systemd', 'user');
  mkdirSync(directory, { recursive: true });
  const unit = `[Unit]\nDescription=OpenArva Personal AI Platform\nAfter=network-online.target\n\n[Service]\nExecStart=${executable} ${args.join(' ')}\nRestart=on-failure\n\n[Install]\nWantedBy=default.target\n`;
  writeFileSync(join(directory, 'openarva.service'), unit, 'utf8');
  return directory;
}

export async function installService() {
  const approved = await confirmExecutionApproval(`install ${serviceName} startup service`);
  if (!approved) return 'Service installation cancelled.';

  if (process.platform === 'win32') {
    try {
      return await installWindows();
    } catch (error) {
      return `Windows service installation failed: ${error instanceof Error ? error.message : 'unknown error'}`;
    }
  }

  if (process.platform === 'linux') {
    const directory = installSystemd();
    try {
      await execFileAsync('systemctl', ['--user', 'daemon-reload']);
      await execFileAsync('systemctl', ['--user', 'enable', '--now', 'openarva.service']);
      return 'systemd user service installed and started.';
    } catch (error) {
      return `systemd unit written to ${directory}; activation failed: ${error instanceof Error ? error.message : 'unknown error'}`;
    }
  }

  return `Automatic startup is not configured for ${process.platform}. Run openarva serve manually.`;
}

export async function startService() {
  const { executable, args } = serviceCommand();
  const child = spawn(executable, [args[0], 'serve', '--port', process.env.OPENARVA_PORT || '18789'], { detached: true, stdio: 'ignore' });
  child.unref();
  return 'OpenArva background gateway started.';
}

export async function runService() {
  const { serveCommand } = await import('./serve.js');
  await serveCommand(Number(process.env.OPENARVA_PORT || 18789));
}

export function serviceStatus() {
  if (process.platform === 'win32') return existsSync(join(process.env.ProgramData || 'C:\\ProgramData', 'OpenArva')) ? 'Windows startup service configured.' : 'Windows startup service not detected.';
  return `Service support available for ${process.platform}.`;
}
