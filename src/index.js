#!/usr/bin/env node
import dotenv from 'dotenv';
import { startBot } from './bot/telegram.js';
import { startWhatsAppBot } from './bot/whatsapp.js';
dotenv.config();
console.log('🚀 Starting openarva AI Agent System v15.3.6...');
startBot();
startWhatsAppBot();
