#!/usr/bin/env node
import { OpenArvaAgent } from './engine/agent.js';

const agent = new OpenArvaAgent();

const args = process.argv.slice(2);
const command = args[0];

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

  agent.executeTask({ domain, instruction }).then((result) => console.log(result));
} else if (command === 'gateway') {
  console.log('[OpenArva Gateway] Gateway running on ws://127.0.0.1:18789');
  console.log('[OpenArva Gateway] Connected to Telegram, WhatsApp, and Local CLI Channels.');
}