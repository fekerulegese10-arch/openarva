declare function askOpenArva(message: string): Promise<string>;
declare function executeCommand(command: string): Promise<string>;

export function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log('⚠️ [Telegram] No token provided, Telegram bot disabled.');
    return;
  }

  const api = `https://api.telegram.org/bot${token}`;
  let offset = 0;

  console.log('🤖 [OpenArva Telegram Bot] Starting...');
  console.log('💬 Listening for messages on Telegram...');

  // Continuous polling loop
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

            console.log(`📨 [Telegram] Message: "${message.text.substring(0, 50)}..."`);

            const userMsg = message.text;
            let reply: string;

            if (userMsg.startsWith('/cmd ')) {
              const command = userMsg.replace('/cmd ', '');
              console.log(`⚙️ Executing: ${command}`);
              const output = await executeCommand(command);
              reply = `✅ Command Output:\n\`\`\`\n${output}\n\`\`\``;
            } else {
              console.log(`🧠 Processing with AI...`);
              reply = await askOpenArva(userMsg);
            }

            // Send reply to Telegram user
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