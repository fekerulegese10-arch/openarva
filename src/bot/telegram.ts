import { Telegraf } from 'telegraf';
import { askOpenArva } from '../ai/llm.js';
import { executeCommand } from '../engine/executor.js';

export function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const bot = new Telegraf(token);

  bot.on('text', async (ctx) => {
    const userMsg = ctx.message.text;
    if (userMsg.startsWith('/cmd ')) {
      const command = userMsg.replace('/cmd ', '');
      const output = await executeCommand(command);
      return ctx.reply(`[OS Output]:\n${output}`);
    }
    const aiResponse = await askOpenArva(userMsg);
    ctx.reply(aiResponse);
  });

  bot.launch();
}