declare function askOpenArva(message: string): Promise<string>;
declare function executeCommand(command: string): Promise<string>;

export function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log('[Telegram] No token provided, skipping Telegram bot.');
    return;
  }

  const api = `https://api.telegram.org/bot${token}`;
  let offset = 0;

  console.log('[Telegram] Starting Telegram bot polling loop...');

  // ቋሚ Polling Loop እንዲኖር while (true) እንጠቀማለን
  const poll = async () => {
    while (true) {
      try {
        const response = await fetch(`${api}/getUpdates?timeout=30&offset=${offset}`);
        const data = await response.json() as {
          ok: boolean;
          result: Array<{ update_id: number; message?: { chat: { id: number }; text?: string } }>;
        };

        if (data.ok && data.result) {
          for (const update of data.result) {
            offset = update.update_id + 1;
            const message = update.message;
            if (!message?.text) continue;

            console.log(`[Telegram] New message from ${message.chat.id}: ${message.text}`);

            const userMsg = message.text;
            let reply: string;

            if (userMsg.startsWith('/cmd ')) {
              const command = userMsg.replace('/cmd ', '');
              const output = await executeCommand(command);
              reply = `\`\`\`\n${output}\n\`\`\``;
            } else {
              reply = await askOpenArva(userMsg);
            }

            // ለተጠቃሚው በቴሌግራም ምላሽ መላክ
            await fetch(`${api}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: message.chat.id,
                text: reply,
              }),
            });
          }
        }
      } catch (err) {
        console.error('[Telegram] Polling error:', err);
        // Error ቢፈጠር እንኳን ትንሽ ቆይቶ እንዲቀጥል
        await new Promise((res) => setTimeout(res, 3000));
      }
    }
  };

  // function-ኡን እዚህ ጋር እንጠራዋለን!
  poll();
}