import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { platform, release, totalmem, freemem, userInfo } from 'node:os';
import { resolve } from 'node:path';
import { executeWorkspaceCommand } from './workspace.js';

const execFileAsync = promisify(execFile);

export interface ProcessInfo { pid: string; name: string; memory?: string; }

export async function inspectProcesses(): Promise<ProcessInfo[]> {
  if (process.platform === 'win32') {
    const { stdout } = await execFileAsync('tasklist', ['/fo', 'csv', '/nh'], { maxBuffer: 2 * 1024 * 1024 });
    return stdout.trim().split(/\r?\n/).filter(Boolean).map((line) => {
      const values = [...line.matchAll(/"([^"]*)"/g)].map((match) => match[1]);
      return { name: values[0] || '', pid: values[1] || '', memory: values[4] };
    });
  }
  const { stdout } = await execFileAsync('ps', ['-eo', 'pid=,comm=,%mem='], { maxBuffer: 2 * 1024 * 1024 });
  return stdout.trim().split(/\r?\n/).filter(Boolean).map((line) => { const match = line.trim().match(/^(\d+)\s+(\S+)(?:\s+(.*))?$/); return { pid: match?.[1] || '', name: match?.[2] || '', memory: match?.[3] }; });
}

export function getSystemStatus() {
  return { platform: platform(), release: release(), node: process.version, user: userInfo().username, memory: { total: totalmem(), free: freemem() }, uptimeSeconds: Math.round(process.uptime()) };
}

export async function takeScreenshot(outputPath: string) {
  if (process.platform !== 'win32') throw new Error('Native screenshot capture currently supports Windows; use an OS screenshot utility on Linux/macOS.');
  const target = resolve(outputPath);
  const script = `$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $i=New-Object System.Drawing.Bitmap $b.Width,$b.Height; $g=[System.Drawing.Graphics]::FromImage($i); $g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size); $i.Save('${target.replace(/'/g, "''")}',[System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $i.Dispose()`;
  await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script]);
  return target;
}

export async function executeSystemCommand(input: string, cwd = process.cwd(), autoApprove = false) {
  return executeWorkspaceCommand(input, cwd, autoApprove);
}
