import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface MemoryDocument {
  id: string;
  source: 'chat' | 'github' | 'codebase' | 'telegram' | string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryMatch extends MemoryDocument {
  score: number;
}

const dimensions = 128;
const databaseDirectory = join(homedir(), '.openarva', 'memory');
const databasePath = join(databaseDirectory, 'vectors.sqlite');
let database: Database | undefined;

function getDatabase() {
  if (database) return database;
  mkdirSync(databaseDirectory, { recursive: true });
  database = new Database(databasePath);
  database.exec('CREATE TABLE IF NOT EXISTS vector_memories (id TEXT PRIMARY KEY, source TEXT NOT NULL, text TEXT NOT NULL, metadata TEXT NOT NULL DEFAULT \'{}\', embedding TEXT NOT NULL, indexed_at TEXT NOT NULL); CREATE INDEX IF NOT EXISTS idx_vector_memories_source ON vector_memories(source);');
  return database;
}

function tokens(text: string) { return text.toLowerCase().match(/[\p{L}\p{N}_-]{2,}/gu) || []; }

export function embedLocally(text: string) {
  const vector = Array<number>(dimensions).fill(0);
  for (const token of tokens(text)) {
    const digest = createHash('sha256').update(token).digest();
    for (let offset = 0; offset < 4; offset += 1) {
      const index = digest.readUInt32BE(offset * 4) % dimensions;
      vector[index] += digest[offset] % 2 === 0 ? 1 : -1;
    }
  }
  const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return length ? vector.map((value) => value / length) : vector;
}

function similarity(left: number[], right: number[]) { return left.reduce((sum, value, index) => sum + value * (right[index] || 0), 0); }

export function indexMemoryDocument(document: MemoryDocument) {
  const statement = getDatabase().prepare('INSERT OR REPLACE INTO vector_memories (id, source, text, metadata, embedding, indexed_at) VALUES (?, ?, ?, ?, ?, ?)');
  statement.run(document.id, document.source, document.text, JSON.stringify(document.metadata || {}), JSON.stringify(embedLocally(document.text)), new Date().toISOString());
}

export function indexMemoryDocuments(documents: MemoryDocument[]) {
  for (const document of documents) indexMemoryDocument(document);
  return documents.length;
}

interface StoredMemory { id: string; source: string; text: string; metadata: string; embedding: string; }
export function searchMemory(query: string, limit = 5, source?: string): MemoryMatch[] {
  const rows = source
    ? getDatabase().prepare('SELECT id, source, text, metadata, embedding FROM vector_memories WHERE source = ?').all<StoredMemory>(source)
    : getDatabase().prepare('SELECT id, source, text, metadata, embedding FROM vector_memories').all<StoredMemory>();
  const queryVector = embedLocally(query);
  return rows.map((row) => {
    let metadata: Record<string, unknown> = {};
    let embedding: number[] = [];
    try { metadata = JSON.parse(row.metadata) as Record<string, unknown>; embedding = JSON.parse(row.embedding) as number[]; } catch { /* ignore malformed historical rows */ }
    return { id: row.id, source: row.source, text: row.text, metadata, score: similarity(queryVector, embedding) };
  }).sort((left, right) => right.score - left.score).slice(0, Math.max(1, limit));
}

export function vectorStorePath() { return databasePath; }
