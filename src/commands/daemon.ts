import { randomUUID } from 'node:crypto';
import { claimNextTask, markTaskCompleted, markTaskFailed, recoverStaleTasks } from './state.js';
import { OpenArvaAgent, type AgentTask } from '../engine/agent.js';

const domains: AgentTask['domain'][] = ['coding', 'agriculture', 'accounting', 'documents', 'research', 'engineering', 'medicine'];

function taskDomain(value?: string): AgentTask['domain'] {
  return domains.includes(value as AgentTask['domain']) ? value as AgentTask['domain'] : 'coding';
}

export async function runDaemon(options: { intervalMs?: number } = {}) {
  const intervalMs = Math.max(250, options.intervalMs || 2000);
  const workerId = `daemon-${randomUUID()}`;
  const agent = new OpenArvaAgent();
  let stopping = false;
  const stop = () => { stopping = true; };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  console.log(`OpenArva daemon running (${workerId})`);

  while (!stopping) {
    recoverStaleTasks();
    const task = claimNextTask(workerId);
    if (!task) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      continue;
    }

    try {
      await agent.respond(task.description || task.title, taskDomain(task.metadata?.domain));
      markTaskCompleted(task.id);
      console.log(`Completed task ${task.id}: ${task.title}`);
    } catch (error) {
      markTaskFailed(task.id, error instanceof Error ? error.message : String(error));
      console.error(`Failed task ${task.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  process.removeListener('SIGINT', stop);
  process.removeListener('SIGTERM', stop);
  console.log('OpenArva daemon stopped.');
}