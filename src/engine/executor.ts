import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function executeCommand(cmd: string): Promise<string> {
  try {
    const { stdout, stderr } = await execPromise(cmd);
    return stdout || stderr;
  } catch (error: any) {
    return `Error executing command: ${error.message}`;
  }
}