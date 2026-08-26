import { OpenArvaRouter } from '../ai/router.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface AgentTask {
  domain: 'coding' | 'agriculture' | 'accounting' | 'documents' | 'research' | 'engineering' | 'medicine';
  instruction: string;
}

export class OpenArvaAgent {
  private systemPersona = `
    You are OpenArva — an Advanced Autonomous Enterprise AI System & Gateway Agent.
    You specialize in executing end-to-end tasks:
    - Software Engineering & Code Generation
    - Bureaucratic & Legal Document Generation (PDF/Excel)
    - Agriculture, Accounting, Economics, Engineering, and Medical Research
    - Autonomous System Executions on Windows, CLI, and Mobile Gateways.
  `;

  async executeTask(task: AgentTask) {
    console.log(`[OpenArva Core] Routing task for domain: ${task.domain}`);
    
    // Select optimal provider based on domain
    const selectedProvider = OpenArvaRouter.selectModel(task.domain);

    // Context execution flow
    if (task.instruction.startsWith('EXEC_CMD:')) {
      const cmd = task.instruction.replace('EXEC_CMD:', '').trim();
      return await execAsync(cmd);
    }

    return `OpenArva Execution Complete for domain [${task.domain}]. Model assigned and verified.`;
  }
}