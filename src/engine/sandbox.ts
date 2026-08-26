import { spawn } from 'node:child_process';

export function runSandboxedCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); });

    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`Sandbox Execution Failed (Code ${code}): ${stderr}`));
    });
  });
}