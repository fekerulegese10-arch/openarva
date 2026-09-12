import type { GatewayConnector, InboundMessage, OutboundMessage } from './gateway.js';

interface TelegramUpdate {
  update_id: number;
  message?: { chat?: { id?: number }; text?: string };
}

interface TelegramResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
}

export class TelegramConnector implements GatewayConnector {
  readonly channel = 'telegram' as const;
  private readonly token = process.env.TELEGRAM_BOT_TOKEN || '';
  private offset = 0;
  private stopping = false;
  private onMessage: ((message: InboundMessage) => Promise<void>) | null = null;

  async start(onMessage: (message: InboundMessage) => Promise<void>) {
    this.onMessage = onMessage;
    if (!this.token) {
      console.log('Telegram connector disabled: TELEGRAM_BOT_TOKEN is not configured.');
      return;
    }
    this.stopping = false;
    void this.poll();
  }

  async stop() {
    this.stopping = true;
    this.onMessage = null;
  }

  async send(message: OutboundMessage) {
    if (!this.token) throw new Error('Telegram connector is not configured.');
    await this.call('sendMessage', {
      chat_id: message.recipientId,
      text: message.text.slice(0, 4096),
    });
  }

  private async poll() {
    while (!this.stopping && this.token) {
      try {
        const response = await this.call<TelegramUpdate[]>('getUpdates', {
          offset: this.offset,
          timeout: 25,
          allowed_updates: ['message'],
        });
        for (const update of response) {
          this.offset = Math.max(this.offset, update.update_id + 1);
          const text = update.message?.text?.trim();
          const senderId = update.message?.chat?.id;
          if (!text || senderId === undefined || !this.onMessage) continue;
          await this.onMessage({
            channel: 'telegram',
            senderId: String(senderId),
            text,
            receivedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        if (!this.stopping) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Telegram connector error: ${message}`);
          if (/unauthorized|401|invalid token/i.test(message)) {
            this.stopping = true;
            console.error('Telegram connector disabled until TELEGRAM_BOT_TOKEN is corrected.');
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    }
  }

  private async call<T = unknown>(method: string, payload: Record<string, unknown>): Promise<T> {
    const response = await fetch(`https://api.telegram.org/bot${this.token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(35_000),
    });
    const data = await response.json() as TelegramResponse<T>;
    if (!response.ok || !data.ok) throw new Error(data.description || `Telegram HTTP ${response.status}`);
    return data.result;
  }
}
