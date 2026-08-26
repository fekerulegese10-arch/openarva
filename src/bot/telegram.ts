import { askOpenArva } from '../ai/llm.js';
import { executeCommand } from '../engine/executor.js';

export function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const api = `https://api.telegram.org/bot${token}`;
  let offset = 0;

  const poll = async () => {
    const response = await fetch(`${api}/getUpdates?timeout=30&offset=${offset}`);
    const data = await response.json() as {
      ok: boolean;
      result: Array<{ update_id: number; message?: { chat: { id: number }; text?: string } }>;
    };

    if (!data.ok) return;
    for (const update of data.result) {
      offset = update.update_id + 1;
      const message = update.message;
      if (!message?.text) continue;

      const userMsg = message.text;
      let reply: string;
      if (userMsg.startsWith('/cmd ')) {
        const command = userMsg.replace('/cmd ', '');
        const output = await executeCommand(command);
        reply = `[OS Output]:\n${output}`;
      } else {
        reply = await askOpenArva(userMsg);
      }

      await fetch(`${api}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: message.chat.id, text: reply }),
      });
    }
  };

  void (async () => {
    while (true) {
      try {
        await poll();
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  })();
}