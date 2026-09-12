import { existsSync, readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { routeAiCompletion } from '../ai/providers.js';
import { ensureDefaultTemplates, redactPii, recordAudit } from '../security/privacy.js';

export interface BatchResult {
  file: string;
  status: 'processed' | 'skipped' | 'error';
  output?: string;
  issue?: string;
}

export async function runBatchProcessor(targetDir: string, templateName?: string) {
  const resolvedDir = targetDir || process.cwd();
  if (!existsSync(resolvedDir)) {
    throw new Error(`Directory not found: ${resolvedDir}`);
  }

  const templateDir = ensureDefaultTemplates();
  const templatePath = templateName ? join(templateDir, templateName) : join(templateDir, 'institutional-report.md');
  const templateText = existsSync(templatePath) ? readFileSync(templatePath, 'utf8') : '# Batch Report\n\n';

  const files = readdirSync(resolvedDir, { withFileTypes: true });
  const results: BatchResult[] = [];

  for (const item of files) {
    const fullPath = join(resolvedDir, item.name);
    if (item.isDirectory()) {
      continue;
    }

    const ext = extname(item.name).toLowerCase();
    if (!['.txt', '.md', '.csv', '.json'].includes(ext)) {
      continue;
    }

    const raw = readFileSync(fullPath, 'utf8');
    const safeInput = redactPii(raw);

    try {
      const output = await routeAiCompletion(`Summarize and structure the following document. Use the template below.\n\nTEMPLATE:\n${templateText}\n\nDOCUMENT:\n${safeInput}`);
      const outputPath = join(resolvedDir, `${item.name}.report.md`);
      writeFileSync(outputPath, output, 'utf8');
      results.push({ file: item.name, status: 'processed', output: outputPath });
      recordAudit('batch_process', `Processed ${item.name} into ${outputPath}`);
    } catch (error) {
      results.push({ file: item.name, status: 'error', issue: error instanceof Error ? error.message : String(error) });
      recordAudit('batch_process_error', `Failed to process ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return results;
}
