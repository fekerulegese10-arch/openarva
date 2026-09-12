import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { indexCrawlRecords, type CrawlRecord } from './store.js';

export interface TelegramCrawlOptions { file?: string; token?: string; chatId?: string; }

function makeRecord(message: Record<string, unknown>, index: number): CrawlRecord | null {
  const text = typeof message.text === 'string' ? message.text : Array.isArray(message.text) ? message.text.map((part) => typeof part === 'string' ? part : typeof part === 'object' && part && 'text' in part ? String((part as { text: unknown }).text) : '').join('') : '';
  if (!text.trim()) return null;
  const id = String(message.id || message.message_id || index);
  return { id: createHash('sha256').update(`telegram:${id}:${text}`).digest('hex'), source: 'telegram', kind: 'message', text, title: `Telegram message ${id}`, metadata: { date: message.date, from: message.from, chat: message.chat }, indexedAt: new Date().toISOString() };
}

export async function crawlTelegram(options: TelegramCrawlOptions = {}) {
  let messages: Record<string, unknown>[] = [];
  if (options.file) {
    const parsed = JSON.parse(readFileSync(options.file, 'utf8')) as { messages?: Record<string, unknown>[] } | Record<string, unknown>[];
    messages = Array.isArray(parsed) ? parsed : parsed.messages || [];
  } else if (options.token) {
    const query = options.chatId ? `?chat_id=${encodeURIComponent(options.chatId)}` : '';
    const response = await fetch(`https://api.telegram.org/bot${options.token}/getUpdates${query}`, { signal: AbortSignal.timeout(20_000) });
    const payload = await response.json() as { ok: boolean; result?: Array<{ message?: Record<string, unknown> }> };
    if (!payload.ok) throw new Error('Telegram getUpdates failed. Check TELEGRAM_BOT_TOKEN.');
    messages = (payload.result || []).flatMap((item) => item.message ? [item.message] : []);
  } else {
    throw new Error('Provide --file <Telegram export.json> or TELEGRAM_BOT_TOKEN for Telegram API crawling.');
  }
  const records = messages.map(makeRecord).filter((record): record is CrawlRecord => Boolean(record));
  return { fetched: messages.length, indexed: indexCrawlRecords(records) };
}
