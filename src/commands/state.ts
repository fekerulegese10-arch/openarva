import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import chalk from 'chalk';

export interface OpenArvaTask {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  userId?: string;
  metadata?: Record<string, string>;
  attempts?: number;
  lastError?: string;
  claimedBy?: string;
  claimedAt?: string;
}

export interface OpenArvaState {
  tasks: OpenArvaTask[];
  preferences: Record<string, string>;
  workflowState: Record<string, string>;
}

export function getStateDbPath() {
  const dir = join(homedir(), '.openarva');
  mkdirSync(dir, { recursive: true });
  return join(dir, 'state.db');
}

export function loadState(): OpenArvaState {
  const statePath = getStateDbPath();
  if (!existsSync(statePath)) {
    return { tasks: [], preferences: {}, workflowState: {} };
  }

  try {
    const parsed = JSON.parse(readFileSync(statePath, 'utf8')) as OpenArvaState;
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      preferences: parsed.preferences || {},
      workflowState: parsed.workflowState || {},
    };
  } catch {
    const backupPath = `${statePath}.bak`;
    if (existsSync(backupPath)) {
      try {
        return JSON.parse(readFileSync(backupPath, 'utf8')) as OpenArvaState;
      } catch {
        return { tasks: [], preferences: {}, workflowState: {} };
      }
    }
    return { tasks: [], preferences: {}, workflowState: {} };
  }
}

export function saveState(state: OpenArvaState) {
  const statePath = getStateDbPath();
  const temporaryPath = `${statePath}.tmp`;
  if (existsSync(statePath)) writeFileSync(`${statePath}.bak`, readFileSync(statePath));
  writeFileSync(temporaryPath, JSON.stringify(state, null, 2), 'utf8');
  renameSync(temporaryPath, statePath);
}

export function addTask(task: Omit<OpenArvaTask, 'createdAt' | 'updatedAt'> & { createdAt?: string; updatedAt?: string }) {
  const state = loadState();
  const now = new Date().toISOString();
  const newTask: OpenArvaTask = {
    ...task,
    createdAt: task.createdAt || now,
    updatedAt: task.updatedAt || now,
    status: task.status || 'pending',
  };
  state.tasks.push(newTask);
  saveState(state);
  return newTask;
}

export function updateTaskStatus(taskId: string, status: OpenArvaTask['status']) {
  const state = loadState();
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return null;

  task.status = status;
  task.updatedAt = new Date().toISOString();
  if (status !== 'in_progress') {
    task.claimedBy = undefined;
    task.claimedAt = undefined;
  }
  saveState(state);
  return task;
}

export function recoverStaleTasks(staleAfterMs = 15 * 60 * 1000) {
  const state = loadState();
  const cutoff = Date.now() - staleAfterMs;
  let recovered = 0;
  for (const task of state.tasks) {
    if (task.status !== 'in_progress') continue;
    const claimedAt = task.claimedAt ? Date.parse(task.claimedAt) : Date.parse(task.updatedAt);
    if (!Number.isFinite(claimedAt) || claimedAt > cutoff) continue;
    task.status = 'pending';
    task.updatedAt = new Date().toISOString();
    task.claimedBy = undefined;
    task.claimedAt = undefined;
    task.lastError = 'Recovered after an interrupted worker run.';
    recovered += 1;
  }
  if (recovered) saveState(state);
  return recovered;
}

export function claimNextTask(workerId: string) {
  const state = loadState();
  const task = state.tasks.find((item) => item.status === 'pending');
  if (!task) return null;

  const now = new Date().toISOString();
  task.status = 'in_progress';
  task.updatedAt = now;
  task.claimedAt = now;
  task.claimedBy = workerId;
  task.attempts = (task.attempts || 0) + 1;
  saveState(state);
  return task;
}

export function markTaskCompleted(taskId: string) {
  return updateTaskStatus(taskId, 'completed');
}

export function markTaskFailed(taskId: string, error: string) {
  const state = loadState();
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return null;
  task.status = 'failed';
  task.lastError = error.slice(-4000);
  task.updatedAt = new Date().toISOString();
  task.claimedBy = undefined;
  task.claimedAt = undefined;
  saveState(state);
  return task;
}

export function listTasks() {
  return loadState().tasks;
}

export function getTask(taskId: string) {
  return listTasks().find((task) => task.id === taskId) || null;
}

export function setPreference(key: string, value: string) {
  const state = loadState();
  state.preferences[key] = value;
  saveState(state);
}

export function getPreference(key: string) {
  return loadState().preferences[key] || '';
}

export async function confirmExecutionApproval(actionDescription: string, autoBypass = false): Promise<boolean> {
  const shouldBypass = autoBypass || process.argv.includes('--yes') || process.argv.includes('--force');
  if (shouldBypass) {
    return true;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => {
    console.log(chalk.yellow(`Action preview: ${actionDescription}`));
    rl.question(chalk.yellow('Do you approve executing this action? (y/N) '), (value) => {
      rl.close();
      resolve(value.trim());
    });
  });

  return /^y(es)?$/i.test(answer);
}

export function renderTaskTable() {
  const tasks = listTasks();
  if (!tasks.length) {
    console.log('No tasks recorded yet.');
    return;
  }

  console.log(chalk.cyan.bold('OpenArva Task Memory'));
  console.log('ID | STATUS | TITLE');
  for (const task of tasks) {
    console.log(`${task.id.slice(0, 8)} | ${task.status} | ${task.title}`);
  }
}
