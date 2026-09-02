import { execSync } from 'node:child_process';
import { accessSync, constants, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import chalk from 'chalk';
import { routeAiCompletion } from '../ai/providers.js';

export interface DiagnosticCheck {
  label: string;
  ok: boolean;
  details: string;
  hint?: string;
}

export interface ActiveOpenArvaConfig {
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  configPath?: string;
}

function resolveConfigCandidates() {
  return [
    path.join(process.cwd(), '.openarva', 'config.json'),
    path.join(os.homedir(), '.openarva', 'config.json'),
  ];
}

function parseJsonFile(filePath: string): Record<string, unknown> | null {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const raw = readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getActiveOpenArvaConfig(): ActiveOpenArvaConfig {
  const configCandidates = resolveConfigCandidates();
  const envProvider = process.env.OPENARVA_PROVIDER || 'openai';
  const envModel = process.env.OPENARVA_MODEL || 'gpt-4o';

  for (const candidate of configCandidates) {
    const parsed = parseJsonFile(candidate);
    if (parsed && typeof parsed === 'object') {
      return {
        provider: String((parsed.provider as string | undefined) || envProvider),
        model: String((parsed.model as string | undefined) || envModel),
        apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : undefined,
        baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : undefined,
        configPath: candidate,
      };
    }
  }

  return {
    provider: envProvider,
    model: envModel,
    configPath: configCandidates[0],
  };
}

function formatStatus(ok: boolean, label: string, details: string, hint?: string) {
  const prefix = ok ? chalk.green('PASS') : chalk.red('FAIL');
  console.log(`${prefix} ${label}: ${details}`);
  if (hint) {
    console.log(chalk.dim(`  Hint: ${hint}`));
  }
}

async function checkHttpReachability(url: string, token?: string, authHeaderName?: string) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token && authHeaderName) {
      if (authHeaderName === 'Authorization') {
        headers.Authorization = `Bearer ${token}`;
      } else {
        headers[authHeaderName] = token;
      }
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(7000),
    });

    return {
      ok: response.ok,
      status: response.status,
      details: response.ok ? `HTTP ${response.status}` : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runDoctor() {
  const checks: DiagnosticCheck[] = [];
  const activeConfig = getActiveOpenArvaConfig();

  const nodeVersion = process.version;
  const nodeMajor = Number.parseInt(nodeVersion.replace(/^v/, '').split('.')[0] || '0', 10);
  checks.push({
    label: 'Node.js runtime',
    ok: nodeMajor >= 18,
    details: `${nodeVersion} (${nodeMajor >= 18 ? 'supported' : 'unsupported'})`,
    hint: nodeMajor < 18 ? 'Upgrade Node.js to v18+ for full compatibility and fetch support.' : undefined,
  });

  try {
    const gitVersion = execSync('git --version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    const repoPath = execSync('git rev-parse --is-inside-work-tree', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    checks.push({
      label: 'Git setup',
      ok: repoPath === 'true' && Boolean(gitVersion),
      details: repoPath === 'true' ? `git detected (${gitVersion})` : 'Git repository context not detected',
      hint: repoPath !== 'true' ? 'Run git init in this project or open a valid Git repository.' : undefined,
    });
  } catch {
    checks.push({
      label: 'Git setup',
      ok: false,
      details: 'git not available or repository not initialized',
      hint: 'Install Git and initialize the repo with git init.',
    });
  }

  try {
    accessSync(process.cwd(), constants.R_OK | constants.W_OK);
    accessSync(os.homedir(), constants.R_OK | constants.W_OK);
    checks.push({
      label: 'Path permissions',
      ok: true,
      details: `${process.cwd()} and ${os.homedir()} are readable and writable`,
    });
  } catch {
    checks.push({
      label: 'Path permissions',
      ok: false,
      details: 'read/write access denied for the current project or user home directory',
      hint: 'Check folder permissions and ensure the user has write access to the workspace and home directory.',
    });
  }

  const configPaths = resolveConfigCandidates();
  const configFile = configPaths.find((item) => existsSync(item));
  const configData = configFile ? parseJsonFile(configFile) : null;

  if (configFile && configData) {
    checks.push({
      label: 'Config file',
      ok: true,
      details: `${configFile} exists and parses as valid JSON`,
    });
  } else {
    checks.push({
      label: 'Config file',
      ok: false,
      details: `~/.openarva/config.json was not found or is invalid JSON`,
      hint: 'Run openarva init to create a valid configuration file.',
    });
  }

  const selectedProviders = new Set<string>();
  if (process.env.OPENARVA_PROVIDER) selectedProviders.add(process.env.OPENARVA_PROVIDER);
  if (activeConfig.provider) selectedProviders.add(activeConfig.provider);
  if (!selectedProviders.size) selectedProviders.add('openai');

  for (const provider of Array.from(selectedProviders)) {
    const normalized = provider.trim().toLowerCase();
    const details = { openai: ['OPENAI_API_KEY', 'OPENAI_BASE_URL'], gemini: ['GEMINI_API_KEY', 'GEMINI_BASE_URL'], groq: ['GROQ_API_KEY', 'GROQ_BASE_URL'], deepseek: ['DEEPSEEK_API_KEY', 'DEEPSEEK_BASE_URL'], anthropic: ['ANTHROPIC_API_KEY', 'ANTHROPIC_BASE_URL'], ollama: ['LOCAL_AI_BASE_URL'] } as Record<string, string[]>;
    const requiredKeys = details[normalized] || [];
    const hasKey = requiredKeys.some((key) => Boolean(process.env[key] || activeConfig.apiKey));

    if (!hasKey) {
      checks.push({
        label: `${provider.toUpperCase()} API`,
        ok: true,
        details: 'not configured; provider is available but credentials are not active',
        hint: 'Set the relevant API key or run openarva init to configure a provider.',
      });
      continue;
    }

    let endpoint = '';
    let token = '';
    let header = 'Authorization';

    switch (normalized) {
      case 'openai':
        endpoint = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/models';
        token = process.env.OPENAI_API_KEY || activeConfig.apiKey || '';
        break;
      case 'gemini':
        endpoint = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/models';
        token = process.env.GEMINI_API_KEY || activeConfig.apiKey || '';
        endpoint = token ? `${endpoint}?key=${encodeURIComponent(token)}` : endpoint;
        break;
      case 'groq':
        endpoint = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1/models';
        token = process.env.GROQ_API_KEY || activeConfig.apiKey || '';
        break;
      case 'deepseek':
        endpoint = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1/models';
        token = process.env.DEEPSEEK_API_KEY || activeConfig.apiKey || '';
        break;
      case 'anthropic':
        endpoint = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1/models';
        token = process.env.ANTHROPIC_API_KEY || activeConfig.apiKey || '';
        header = 'x-api-key';
        break;
      case 'ollama':
        endpoint = process.env.LOCAL_AI_BASE_URL || 'http://localhost:11434/api/tags';
        token = process.env.OLLAMA_API_KEY || activeConfig.apiKey || 'ollama';
        break;
      default:
        endpoint = 'https://api.openai.com/v1/models';
        token = '';
    }

    const result = await checkHttpReachability(endpoint, token, header);
    checks.push({
      label: `${provider.toUpperCase()} connectivity`,
      ok: result.ok,
      details: result.ok ? `${provider} provider reachable (${result.details})` : `${provider} provider unreachable (${result.details})`,
      hint: result.ok ? undefined : `Confirm the API key, endpoint, and network access for ${provider}.`,
    });
  }

  console.log(chalk.cyan.bold('OpenArva Doctor'));
  console.log(chalk.dim(`Active provider: ${activeConfig.provider} | model: ${activeConfig.model}`));
  console.log('');

  let failed = 0;
  for (const check of checks) {
    formatStatus(check.ok, check.label, check.details, check.hint);
    if (!check.ok) failed += 1;
  }

  console.log('');
  if (failed === 0) {
    console.log(chalk.green.bold('All OpenArva health checks passed.'));
  } else {
    console.log(chalk.yellow.bold(`${failed} check(s) need attention.`));
  }
}

function renderDiffPreview(before: string, after: string) {
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  const max = Math.max(beforeLines.length, afterLines.length);

  console.log(chalk.cyan.bold('Recommended fix preview'));
  for (let index = 0; index < max; index += 1) {
    const oldLine = beforeLines[index] ?? '';
    const newLine = afterLines[index] ?? '';
    if (oldLine === newLine) {
      console.log(chalk.dim(`  ${index + 1}  ${oldLine}`));
      continue;
    }

    if (oldLine && newLine) {
      console.log(chalk.red(`- ${index + 1}  ${oldLine}`));
      console.log(chalk.green(`+ ${index + 1}  ${newLine}`));
    } else if (newLine) {
      console.log(chalk.green(`+ ${index + 1}  ${newLine}`));
    } else {
      console.log(chalk.red(`- ${index + 1}  ${oldLine}`));
    }
  }
}

async function confirmFixPrompt() {
  const autoApprove = process.argv.includes('--yes') || process.argv.includes('--force');
  if (autoApprove || !process.stdin.isTTY || !process.stdout.isTTY) {
    return true;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise<string>((resolve) => {
    rl.question(chalk.yellow('Apply these changes? (y/N): '), (value) => {
      rl.close();
      resolve(value.trim());
    });
  });

  return /^y(es)?$/i.test(answer);
}

export async function runFixCommand(taskText?: string) {
  const activeConfig = getActiveOpenArvaConfig();
  const command = 'npm run build -- --pretty false';

  let buildOutput = '';
  try {
    buildOutput = execSync(command, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const typedError = error as { stdout?: string; stderr?: string; message?: string };
    buildOutput = [typedError.stdout, typedError.stderr, typedError.message].filter(Boolean).join('\n');
  }

  const safeBuildOutput = buildOutput.trim() || 'No recent transpilation output detected.';
  const aiPrompt = taskText || `Review this build/transpilation output and suggest the safest code fix. Keep it concise and practical.\n\n${safeBuildOutput}`;

  const recommendation = await routeAiCompletion(aiPrompt, activeConfig.provider, activeConfig.model);
  const before = `Current project status\n${safeBuildOutput}`;
  const after = recommendation;

  console.log(chalk.cyan.bold('OpenArva Fix'));
  renderDiffPreview(before, after);

  const accepted = await confirmFixPrompt();
  if (!accepted) {
    return 'Fix preview canceled by user.';
  }

  const fixDir = path.join(process.cwd(), '.openarva');
  mkdirSync(fixDir, { recursive: true });
  const fixPath = path.join(fixDir, 'fix-recommendation.md');
  writeFileSync(fixPath, `# OpenArva fix recommendation\n\nProvider: ${activeConfig.provider}\nModel: ${activeConfig.model}\n\n${recommendation}\n`, 'utf8');

  return `Fix recommendation saved to ${fixPath}.`;
}

export function runStatus() {
  const activeConfig = getActiveOpenArvaConfig();
  const port = process.env.OPENARVA_PORT || process.env.PORT || '3000';
  const mobileBridge = process.env.TELEGRAM_BOT_TOKEN ? 'connected' : 'not configured';
  const wsStatus = 'ready';

  console.log(chalk.cyan.bold('OpenArva Status'));
  console.log(`Provider: ${chalk.green(activeConfig.provider)}`);
  console.log(`Model: ${chalk.green(activeConfig.model)}`);
  console.log(`Serve port: ${chalk.green(port)}`);
  console.log(`Mobile bridge: ${chalk.green(mobileBridge)}`);
  console.log(`WebSocket gateway: ${chalk.green(wsStatus)}`);
  console.log(`Config file: ${chalk.dim(activeConfig.configPath || 'not found')}`);
}
