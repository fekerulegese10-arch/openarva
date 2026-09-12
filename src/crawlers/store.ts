import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export type CrawlSource = 'github' | 'telegram';
export interface CrawlRecord {
  id: string;
  source: CrawlSource;
  kind: string;
  title?: string;
  text: string;
  url?: string;
  metadata?: Record<string, unknown>;
  indexedAt: string;
}

const root = join(homedir(), '.openarva', 'crawls');
const databasePath = join(root, 'openarva-crawls.sqlite');
const legacyPath = join(root, 'records.jsonl');
let database: Database | undefined;

function getDatabase() {
  if (database) return database;
  mkdirSync(root, { recursive: true });
  database = new Database(databasePath);
  database.exec(`CREATE TABLE IF NOT EXISTS crawl_records (id TEXT PRIMARY KEY, source TEXT NOT NULL, kind TEXT NOT NULL, title TEXT, text TEXT NOT NULL, url TEXT, metadata TEXT NOT NULL DEFAULT '{}', indexed_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS idx_crawl_records_source ON crawl_records(source); CREATE INDEX IF NOT EXISTS idx_crawl_records_kind ON crawl_records(kind);`);
  migrateLegacyRecords();
  return database;
}

function migrateLegacyRecords() {
  const marker = `${legacyPath}.migrated`;
  if (!existsSync(legacyPath) || existsSync(marker)) return;
  try {
    const records = readFileSync(legacyPath, 'utf8').split(/\r?\n/).filter(Boolean).flatMap((line) => {
      try { return [JSON.parse(line) as CrawlRecord]; } catch { return []; }
    });
    if (records.length) indexCrawlRecords(records);
    writeFileSync(marker, new Date().toISOString(), 'utf8');
  } catch {
    // Keep the legacy file for a later migration retry.
  }
}

export function crawlStorePath() { mkdirSync(root, { recursive: true }); return databasePath; }
export function ensureCrawlSchema() { getDatabase(); }

export function indexCrawlRecords(records: CrawlRecord[]) {
  const statement = getDatabase().prepare('INSERT OR IGNORE INTO crawl_records (id, source, kind, title, text, url, metadata, indexed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  let indexed = 0;
  for (const record of records) {
    indexed += statement.run(record.id, record.source, record.kind, record.title || null, record.text, record.url || null, JSON.stringify(record.metadata || {}), record.indexedAt).changes;
  }
  return indexed;
}

interface StoredRecord { id: string; source: CrawlSource; kind: string; title: string | null; text: string; url: string | null; metadata: string; indexed_at: string; }
function mapRecord(record: StoredRecord): CrawlRecord {
  let metadata: Record<string, unknown> = {};
  try { metadata = JSON.parse(record.metadata) as Record<string, unknown>; } catch { /* retain empty metadata */ }
  return { id: record.id, source: record.source, kind: record.kind, title: record.title || undefined, text: record.text, url: record.url || undefined, metadata, indexedAt: record.indexed_at };
}

export function readCrawlRecords() { return getDatabase().prepare('SELECT id, source, kind, title, text, url, metadata, indexed_at FROM crawl_records ORDER BY indexed_at DESC').all<StoredRecord>().map(mapRecord); }

export function searchCrawlRecords(query: string) {
  const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
  return getDatabase().prepare("SELECT id, source, kind, title, text, url, metadata, indexed_at FROM crawl_records WHERE title LIKE ? ESCAPE '\\' OR text LIKE ? ESCAPE '\\' ORDER BY indexed_at DESC").all<StoredRecord>(pattern, pattern).map(mapRecord);
}

export function clearCrawlRecords(source?: CrawlSource) {
  const statement = source ? getDatabase().prepare('DELETE FROM crawl_records WHERE source = ?') : getDatabase().prepare('DELETE FROM crawl_records');
  return source ? statement.run(source).changes : statement.run().changes;
}
