import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const pidPath = join(homedir(), '.openarva', 'gateway.pid');

function readGatewayInfo() {
  if (!existsSync(pidPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(pidPath, 'utf8')) as { pid?: number; port?: number };
    return parsed.pid && Number.isInteger(parsed.pid) && parsed.pid > 0
      ? { pid: parsed.pid, port: parsed.port || Number(process.env.OPENARVA_PORT || 3000) }
      : null;
  } catch {
    const pid = Number(readFileSync(pidPath, 'utf8'));
    return Number.isInteger(pid) && pid > 0 ? { pid, port: Number(process.env.OPENARVA_PORT || 3000) } : null;
  }
}

function isRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function gatewayStatus() {
  const info = readGatewayInfo();
  if (!info || !isRunning(info.pid)) {
    if (existsSync(pidPath)) rmSync(pidPath, { force: true });
    return 'OpenArva gateway is stopped.';
  }
  return `OpenArva gateway is running (PID ${info.pid}). Dashboard: http://127.0.0.1:${info.port}/dashboard`;
}

export function startGateway(port = Number(process.env.OPENARVA_PORT || 3000)) {
  const current = readGatewayInfo();
  if (current && isRunning(current.pid)) return gatewayStatus();

  mkdirSync(join(homedir(), '.openarva'), { recursive: true });
  const child = spawn(process.execPath, [process.argv[1], 'serve', '--port', String(port)], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  if (!child.pid) throw new Error('Gateway process could not be started.');
  writeFileSync(pidPath, JSON.stringify({ pid: child.pid, port }), 'utf8');
  child.unref();
  return `OpenArva gateway started (PID ${child.pid}). Dashboard: http://127.0.0.1:${port}/dashboard`;
}

export function stopGateway() {
  const info = readGatewayInfo();
  if (!info || !isRunning(info.pid)) {
    if (existsSync(pidPath)) rmSync(pidPath, { force: true });
    return 'OpenArva gateway is already stopped.';
  }
  process.kill(info.pid);
  rmSync(pidPath, { force: true });
  return `OpenArva gateway stopped (PID ${info.pid}).`;
}

export function openDashboard(port = Number(process.env.OPENARVA_PORT || 3000)) {
  const url = `http://127.0.0.1:${port}/dashboard`;
  const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  return `Dashboard opened at ${url}`;
}