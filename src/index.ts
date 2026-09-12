#!/usr/bin/env node
import { OpenArvaAgent } from './engine/agent.js';
import { renderCliHelp, runOnboarding } from './cli/onboard.js';
import { serveCommand } from './commands/serve.js';
import { detectProjectStack } from './utils/platform.js';
import { runDoctor, runFixCommand, runStatus } from './commands/diagnostics.js';
import { runBatchProcessor } from './commands/batch.js';
import { forgetMemory, indexMemoryFromDirectory } from './commands/learn.js';
import { exportUsageReport, renderUsageDashboard, recordUsage } from './commands/usage.js';
import { renderTaskTable } from './commands/state.js';
import { runModelUpdate } from './commands/update.js';
import { getModeInstruction, renderMode, resolveMode } from './commands/modes.js';
import { installService, runService, serviceStatus, startService } from './commands/service.js';
import { gatewayStatus, openDashboard, startGateway, stopGateway } from './commands/gateway.js';
import { runDaemon } from './commands/daemon.js';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';

const agent = new OpenArvaAgent();

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    const stack = detectProjectStack();
    console.log(chalk.cyan.bold('OpenArva Personal AI Agent'));
    console.log(chalk.dim(`Detected stack: ${stack.length ? stack.join(', ') : 'No project detected'}`));
    renderCliHelp();
    return;
  }

  if (command === 'init' || command === 'setup') {
    await runOnboarding();
    return;
  }

  if (command === 'demo') {
    console.log(chalk.green('Demo mode enabled. No API key required for an instant trial.'));
    console.log(chalk.yellow('OpenArva preview: "AI agent ready for coding, research, and automation tasks."'));
    return;
  }

  if (command === 'start') {
    const entry = fileURLToPath(new URL('./index.js', import.meta.url));
    const child = spawn(process.execPath, [entry, 'daemon'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    console.log(`OpenArva daemon started${child.pid ? ` (PID ${child.pid})` : ''}.`);
    return;
  }

  if (command === 'daemon') {
    await runDaemon();
    return;
  }

  if (command === 'doctor') {
    await runDoctor();
    return;
  }

  if (command === 'usage') {
    const exportIndex = args.findIndex((arg) => arg === '--export');
    if (exportIndex >= 0) {
      const format = (args[exportIndex + 1] || 'json').toLowerCase() as 'json' | 'pdf';
      exportUsageReport(format === 'pdf' ? 'pdf' : 'json');
      return;
    }

    recordUsage({
      timestamp: new Date().toISOString(),
      provider: process.env.OPENARVA_PROVIDER || 'openai',
      model: process.env.OPENARVA_MODEL || 'gpt-4o',
      promptTokens: 120,
      completionTokens: 80,
      totalTokens: 200,
      estimatedCost: 0.002,
    });
    renderUsageDashboard();
    return;
  }

  if (command === 'update') {
    await runModelUpdate({ pull: args.includes('--models') });
    return;
  }

  if (command === 'mode') {
    const mode = resolveMode(args[1]);
    if (!mode) {
      console.error('Unknown mode. Use: design, edu, or dev.');
      process.exitCode = 1;
      return;
    }

    renderMode(mode);
    const instruction = args.slice(2).join(' ') || 'Describe the best workflow for this mode.';
    const result = await agent.executeTask({ domain: mode === 'edu' ? 'research' : mode === 'design' ? 'documents' : 'coding', instruction: getModeInstruction(mode, instruction) });
    console.log(result);
    return;
  }

  if (command === 'tasks') {
    renderTaskTable();
    return;
  }

  if (command === 'service') {
    const action = args[1] || 'status';
    if (action === 'install') {
      console.log(await installService());
      return;
    }

    if (action === 'start') {
      console.log(await startService());
      return;
    }

    if (action === 'run') {
      await runService();
      return;
    }

    if (action === 'status') {
      console.log(serviceStatus());
      return;
    }

    console.log('Unsupported service action. Use: install, start, run, status');
    return;
  }

  if (command === 'status') {
    runStatus();
    return;
  }

  if (command === 'learn') {
    if (args.includes('--forget')) {
      const cleared = forgetMemory();
      console.log(cleared ? 'Memory bank reset successfully.' : 'Memory bank reset failed.');
      return;
    }

    const dirIndex = args.findIndex((arg) => arg === '--index' || arg === '-i');
    const dir = dirIndex >= 0 ? args[dirIndex + 1] : process.cwd();
    const records = indexMemoryFromDirectory(dir);
    console.log(`Indexed ${records.length} memories into the local memory bank.`);
    return;
  }

  if (command === 'batch') {
    const dirIndex = args.findIndex((arg) => arg === '--dir' || arg === '-d');
    const templateIndex = args.findIndex((arg) => arg === '--template' || arg === '-t');
    const dir = dirIndex >= 0 ? args[dirIndex + 1] : process.cwd();
    const template = templateIndex >= 0 ? args[templateIndex + 1] : undefined;
    const results = await runBatchProcessor(dir, template);
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  if (command === 'fix') {
    const taskText = args.slice(1).join(' ') || 'Fix the current repository issues and validate the project with TypeScript checks.';
    const result = await runFixCommand(taskText);
    console.log(result);
    return;
  }

  if (command === 'serve') {
    const portIndex = args.findIndex((arg) => arg === '--port' || arg === '-p');
    const port = portIndex >= 0 ? Number(args[portIndex + 1] || 3000) : 3000;
    await serveCommand(port);
    return;
  }

  if (command === 'commit') {
    const message = args.slice(1).join(' ') || 'chore: improve OpenArva workflow';
    console.log(chalk.green(`OpenArva commit helper ready: ${message}`));
    return;
  }

  if (command === 'run') {
    const domainIndex = args.findIndex((arg) => arg === '-d' || arg === '--domain');
    const instructionIndex = args.findIndex((arg) => arg === '-i' || arg === '--instruction');
    const domains = ['coding', 'agriculture', 'accounting', 'documents', 'research', 'engineering', 'medicine'] as const;
    const requestedDomain = domainIndex >= 0 ? args[domainIndex + 1] : undefined;
    const domain = domains.includes(requestedDomain as (typeof domains)[number])
      ? requestedDomain as (typeof domains)[number]
      : 'coding';
    const instruction = instructionIndex >= 0
      ? args[instructionIndex + 1]
      : 'Initialize OpenArva Environment Checks';

    const result = await agent.executeTask({ domain, instruction });
    console.log(result);
    return;
  }

  if (command === 'gateway') {
    const action = args[1] || 'start';
    const portIndex = args.findIndex((arg) => arg === '--port' || arg === '-p');
    const port = portIndex >= 0 ? Number(args[portIndex + 1] || 3000) : Number(process.env.OPENARVA_PORT || 3000);
    if (action === 'stop') console.log(stopGateway());
    else if (action === 'status') console.log(gatewayStatus());
    else if (action === 'start') console.log(startGateway(port));
    else {
      console.error('Usage: openarva gateway [start|stop|status] [--port 3000]');
      process.exitCode = 1;
    }
    return;
  }

  if (command === 'dashboard') {
    const port = Number(process.env.OPENARVA_PORT || 3000);
    console.log(startGateway(port));
    console.log(openDashboard(port));
    return;
  }

  console.error(`Unknown command: ${command}`);
  renderCliHelp();
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error('[OpenArva Error]', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});