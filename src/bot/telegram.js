import { Telegraf } from 'telegraf';
import { askOpenArva } from '../ai/llm.js';
import { executeCommand } from '../engine/executor.js';
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');
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
export function startBot() {
    bot.launch();
    console.log('🚀 OpenArva AI Agent Telegram Bot is running...');
}
