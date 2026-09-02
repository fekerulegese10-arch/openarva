import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadOpenArvaConfig } from '../config/env.js';

export function getOpenArvaHomeDir() {
  const dir = join(homedir(), '.openarva');
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function getAuditLogPath() {
  return join(getOpenArvaHomeDir(), 'audit.log');
}

export function getOpenArvaTemplateDir() {
  const dir = join(getOpenArvaHomeDir(), 'templates');
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function ensureDefaultTemplates() {
  const templateDir = getOpenArvaTemplateDir();
  const templates = {
    'institutional-report.md': `# Institutional Report\n\n## Summary\n- Organization: \n- Date: \n- Scope: \n\n## Findings\n- \n\n## Action Items\n- \n`,
    'school-form.md': `# School Form\n\n## Student / Institution\n- Name: \n- ID: \n- Grade / Department: \n\n## Notes\n- \n`,
    'medical-summary.md': `# Clinical Summary\n\n## Patient\n- Name: \n- Identifier: \n- Department: \n\n## Observations\n- \n\n## Actions\n- \n`,
  } as const;

  for (const [name, content] of Object.entries(templates)) {
    const target = join(templateDir, name);
    if (!existsSync(target)) {
      writeFileSync(target, content, 'utf8');
    }
  }

  return templateDir;
}

export function redactPii(input: string): string {
  const patterns = [
    [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]'],
    [/\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/g, '[REDACTED_PHONE]'],
    [/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]'],
    [/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g, '[REDACTED_NAME]'],
    [/\b[A-Z]{2,}\d{6,}\b/g, '[REDACTED_ID]'],
  ];

  let redacted = input;
  for (const [pattern, replacement] of patterns) {
    redacted = redacted.replace(pattern, replacement as string);
  }

  return redacted;
}

export function recordAudit(action: string, details: string, userIdentity?: string) {
  const config = loadOpenArvaConfig();
  const privacy = config.privacy || {};
  if (privacy.auditLog === false) {
    return;
  }

  const logLine = JSON.stringify({
    timestamp: new Date().toISOString(),
    user: userIdentity || privacy.userIdentity || process.env.OPENARVA_USER || 'unknown-user',
    action,
    details,
  });

  appendFileSync(getAuditLogPath(), `${logLine}\n`, 'utf8');
}

export function resolveEffectiveProvider(provider?: string) {
  const config = loadOpenArvaConfig();
  const privacyMode = config.privacy?.localOnly === true || process.env.OPENARVA_LOCAL_ONLY === 'true';

  if (privacyMode) {
    return 'ollama';
  }

  return provider || config.provider || process.env.OPENARVA_PROVIDER || 'openai';
}

export function sanitizePromptForTransmission(prompt: string, provider?: string) {
  const config = loadOpenArvaConfig();
  const privacy = config.privacy || {};
  const effectiveProvider = resolveEffectiveProvider(provider);

  if (privacy.localOnly === true || process.env.OPENARVA_LOCAL_ONLY === 'true') {
    return redactPii(`${prompt} [local-only mode active: provider forced to ollama]`);
  }

  if (privacy.redactPii !== false) {
    return redactPii(prompt);
  }

  if (effectiveProvider === 'ollama' || effectiveProvider === 'local') {
    return prompt;
  }

  return redactPii(prompt);
}

export function readTextFileSafe(filePath: string): string | null {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    return readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}
