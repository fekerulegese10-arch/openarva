import { Bot } from 'grammy';
import { askOpenArva } from '../ai/llm.js';
import { executeCommand } from '../engine/executor.js';
const token = process.env.TELEGRAM_BOT_TOKEN;
export function startBot() {
    if (!token) {
        console.log('Telegram bot disabled: TELEGRAM_BOT_TOKEN is not configured.');
        return;
    }
    const bot = new Bot(token);
    bot.on('message:text', async (ctx) => {
        const userMsg = ctx.message.text;
    if (userMsg.startsWith('/cmd ')) {
        const command = userMsg.replace('/cmd ', '');
        const output = await executeCommand(command);
        return ctx.reply(`[OS Output]:\n${output}`);
    }
    const aiResponse = await askOpenArva(userMsg);
        return ctx.reply(aiResponse);
    });
    bot.start().catch((error) => console.error(`[Telegram] Bot stopped: ${error instanceof Error ? error.message : String(error)}`));
    console.log('OpenArva Telegram bot is running.');
}
