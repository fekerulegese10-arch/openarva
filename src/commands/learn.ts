import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { homedir } from 'node:os';
import { sanitizePromptForTransmission, recordAudit } from '../security/privacy.js';

export interface MemoryRecord {
  id: string;
  source: string;
  text: string;
  createdAt: string;
}

export function getMemoryRoot() {
  const root = join(homedir(), '.openarva', 'memory');
  mkdirSync(root, { recursive: true });
  return root;
}

export function getMemoryIndexPath() {
  return join(getMemoryRoot(), 'memory-index.json');
}

export function loadMemoryIndex(): MemoryRecord[] {
  const file = getMemoryIndexPath();
  if (!existsSync(file)) return [];

  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as MemoryRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMemoryIndex(records: MemoryRecord[]) {
  writeFileSync(getMemoryIndexPath(), JSON.stringify(records, null, 2), 'utf8');
}

function listFilesRecursively(rootDir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    const full = join(rootDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursively(full));
    } else if (['.md', '.txt', '.ts', '.tsx', '.js', '.json', '.yaml', '.yml', '.py', '.java', '.go', '.rs'].includes(extname(entry.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

function extractTextFromFile(filePath: string) {
  const raw = readFileSync(filePath, 'utf8');
  return sanitizePromptForTransmission(raw, 'ollama');
}

export function indexMemoryFromDirectory(targetDir: string) {
  const root = targetDir || process.cwd();
  if (!existsSync(root)) {
    throw new Error(`Directory not found: ${root}`);
  }

  const records = loadMemoryIndex();
  const files = listFilesRecursively(root);

  for (const file of files) {
    const text = extractTextFromFile(file);
    if (!text || text.trim().length < 15) continue;

    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    records.push({
      id,
      source: file,
      text,
      createdAt: new Date().toISOString(),
    });
  }

  saveMemoryIndex(records);
  recordAudit('learn_index', `Indexed ${files.length} files from ${root}`);
  return records;
}

export function forgetMemory() {
  const memoryRoot = getMemoryRoot();
  const indexPath = getMemoryIndexPath();
  if (existsSync(indexPath)) {
    rmSync(indexPath, { force: true });
  }
  rmSync(memoryRoot, { recursive: true, force: true });
  mkdirSync(memoryRoot, { recursive: true });
  recordAudit('learn_forget', 'Memory reset requested and local memory directory cleared');
  return true;
}

export function retrieveRelevantMemory(query: string, limit = 5): MemoryRecord[] {
  const index = loadMemoryIndex();
  if (!index.length) return [];

  const normalized = query.toLowerCase();
  const scored = index
    .map((record) => {
      const sourceScore = record.source.toLowerCase().includes(normalized) ? 2 : 0;
      const textScore = record.text.toLowerCase().includes(normalized) ? 3 : 0;
      const keywordMatches = normalized.split(/\s+/).filter(Boolean).reduce((count, token) => {
        return record.text.toLowerCase().includes(token) ? count + 1 : count;
      }, 0);
      return { record, score: sourceScore + textScore + keywordMatches };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.record);

  return scored.length ? scored : index.slice(0, limit);
}
