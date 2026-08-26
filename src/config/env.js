import dotenv from 'dotenv';
dotenv.config();
export const config = {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    port: process.env.PORT || 3000,
};
