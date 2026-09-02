#!/usr/bin/env node
import dotenv from 'dotenv';
import { startBot } from './bot/telegram.js';
import { startWhatsAppBot } from './bot/whatsapp.js';
dotenv.config();
console.log('🚀 Starting OpenArva AI Agent System v17.6.14...');
startBot();
startWhatsAppBot();
