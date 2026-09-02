import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadOpenArvaConfig } from '../config/env.js';

export interface UsageEvent {
  timestamp: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  organizationName?: string;
  developerId?: string;
}

export function getUsagePath() {
  const root = join(homedir(), '.openarva');
  mkdirSync(root, { recursive: true });
  return join(root, 'usage.json');
}

export function loadUsage(): UsageEvent[] {
  const path = getUsagePath();
  if (!existsSync(path)) return [];

  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as UsageEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveUsage(events: UsageEvent[]) {
  writeFileSync(getUsagePath(), JSON.stringify(events, null, 2), 'utf8');
}

export function recordUsage(event: UsageEvent) {
  const config = loadOpenArvaConfig();
  const events = loadUsage();
  const enriched: UsageEvent = {
    ...event,
    organizationName: event.organizationName || config.organizationName || 'unknown-org',
    developerId: event.developerId || config.developerId || 'unknown-developer',
    timestamp: event.timestamp || new Date().toISOString(),
  };
  events.push(enriched);
  saveUsage(events);
  return enriched;
}

const providerRates: Record<string, number> = {
  openai: 0.0025,
  gemini: 0.0015,
  groq: 0.0008,
  anthropic: 0.003,
  deepseek: 0.0012,
  ollama: 0,
  local: 0,
  lmstudio: 0,
};

function formatCurrency(value: number) {
  return `$${value.toFixed(4)}`;
}

function makeBar(value: number, max: number, width = 20) {
  const filled = max === 0 ? 0 : Math.max(0, Math.round((value / max) * width));
  return '█'.repeat(Math.max(1, filled)) + ' '.repeat(Math.max(0, width - filled));
}

export function renderUsageDashboard() {
  const events = loadUsage();
  if (!events.length) {
    console.log('No usage records yet. Run openarva init and use the agent to produce telemetry.');
    return;
  }

  const byProvider = events.reduce<Record<string, { tokens: number; cost: number }>>((acc, event) => {
    const provider = event.provider.toLowerCase();
    const rate = providerRates[provider] || 0.001;
    const current = acc[provider] || { tokens: 0, cost: 0 };
    current.tokens += event.totalTokens;
    current.cost += event.estimatedCost || event.totalTokens * rate / 1000;
    acc[provider] = current;
    return acc;
  }, {});

  const daily = new Map<string, number>();
  for (const event of events) {
    const day = new Date(event.timestamp).toISOString().slice(0, 10);
    daily.set(day, (daily.get(day) || 0) + event.totalTokens);
  }

  const monthly = new Map<string, number>();
  for (const event of events) {
    const month = new Date(event.timestamp).toISOString().slice(0, 7);
    monthly.set(month, (monthly.get(month) || 0) + event.totalTokens);
  }

  const totalTokens = events.reduce((sum, e) => sum + e.totalTokens, 0);
  const totalCost = events.reduce((sum, e) => sum + (e.estimatedCost || 0), 0);
  const maxDaily = Math.max(...Array.from(daily.values()), 1);
  const maxMonthly = Math.max(...Array.from(monthly.values()), 1);

  console.log('OpenArva Usage Dashboard');
  console.log(`Organization: ${events[0]?.organizationName || 'unknown-org'} | Developer: ${events[0]?.developerId || 'unknown-developer'}`);
  console.log(`Total tokens: ${totalTokens} | Estimated cost: ${formatCurrency(totalCost)}`);
  console.log('');
  console.log('Daily token usage');
  Array.from(daily.entries())
    .slice(-7)
    .forEach(([day, value]) => {
      console.log(`${day} | ${makeBar(value, maxDaily)} ${value}`);
    });

  console.log('');
  console.log('Monthly token usage');
  Array.from(monthly.entries())
    .slice(-6)
    .forEach(([month, value]) => {
      console.log(`${month} | ${makeBar(value, maxMonthly)} ${value}`);
    });

  console.log('');
  console.log('Provider breakdown');
  Object.entries(byProvider).forEach(([provider, summary]) => {
    console.log(`${provider.toUpperCase()} | ${summary.tokens} tokens | ${formatCurrency(summary.cost)}`);
  });

  console.log('');
  console.log('Billing / Payment Routing');
  console.log('  USDT (TRC20): TNfDCVCZ11PTrQRTXzoAPhQPBuQetf1MSQ');
  console.log('  CBE Account: 1000706450622 (Fekeru Negese)');
  console.log('  Visa Card: 4410290147318359');
}

function createPdfReport(reportText: string) {
  const lines = reportText.split('\n');
  const content = lines
    .map((line) => `BT /F1 12 Tf 50 ${820 - lines.indexOf(line) * 18} Td (${line.replace(/\(/g, '\\(').replace(/\)/g, '\\)')}) Tj ET`)
    .join('\n');

  const pdf = `%PDF-1.4\n1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n4 0 obj<< /Length ${content.length} >>stream\n${content}\nendstream\nendobj\n5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000120 00000 n \n0000000380 00000 n \n0000000850 00000 n \ntrailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n940\n%%EOF`;

  return pdf;
}

export function exportUsageReport(format: 'json' | 'pdf') {
  const events = loadUsage();
  const config = loadOpenArvaConfig();
  const report = {
    organizationName: config.organizationName || 'unknown-org',
    developerId: config.developerId || 'unknown-developer',
    generatedAt: new Date().toISOString(),
    totalTokens: events.reduce((sum, e) => sum + e.totalTokens, 0),
    totalCost: events.reduce((sum, e) => sum + (e.estimatedCost || 0), 0),
    events,
    paymentRouting: {
      usdt: 'TNfDCVCZ11PTrQRTXzoAPhQPBuQetf1MSQ',
      cbe: '1000706450622',
      visa: '4410290147318359',
    },
  };

  if (format === 'json') {
    const file = join(homedir(), '.openarva', 'usage-report.json');
    writeFileSync(file, JSON.stringify(report, null, 2), 'utf8');
    console.log(`JSON usage report saved to ${file}`);
    return;
  }

  const pdfPath = join(homedir(), '.openarva', 'usage-report.pdf');
  writeFileSync(pdfPath, createPdfReport(`OpenArva Usage Report\nOrganization: ${report.organizationName}\nDeveloper: ${report.developerId}\nGenerated At: ${report.generatedAt}\nTotal Tokens: ${report.totalTokens}\nEstimated Cost: $${report.totalCost.toFixed(4)}\n\nPayment routing:\nUSDT: TNfDCVCZ11PTrQRTXzoAPhQPBuQetf1MSQ\nCBE: 1000706450622\nVisa: 4410290147318359`), 'utf8');
  console.log(`PDF usage report saved to ${pdfPath}`);
}
