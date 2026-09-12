import type { GatewayConnector, InboundMessage, OutboundMessage } from './gateway.js';

function parseForm(body: string) {
  return new URLSearchParams(body);
}

export class WhatsAppConnector implements GatewayConnector {
  readonly channel = 'whatsapp' as const;
  private readonly accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  private readonly authToken = process.env.TWILIO_AUTH_TOKEN || '';
  private readonly from = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER || '';
  private onMessage: ((message: InboundMessage) => Promise<void>) | null = null;

  async start(onMessage: (message: InboundMessage) => Promise<void>) {
    this.onMessage = onMessage;
    if (!this.accountSid || !this.authToken || !this.from) {
      console.log('WhatsApp connector webhook mode: set Twilio credentials to enable outbound replies.');
    }
  }

  async stop() {
    this.onMessage = null;
  }

  parseWebhook(body: string, contentType = ''): InboundMessage | null {
    const values = contentType.includes('application/json')
      ? JSON.parse(body) as Record<string, unknown>
      : Object.fromEntries(parseForm(body).entries());
    const text = typeof values.Body === 'string' ? values.Body.trim() : '';
    const sender = typeof values.From === 'string' ? values.From.trim() : '';
    if (!text || !sender) return null;
    return {
      channel: 'whatsapp',
      senderId: sender,
      text,
      receivedAt: new Date().toISOString(),
      metadata: { messageSid: typeof values.MessageSid === 'string' ? values.MessageSid : '' },
    };
  }

  async send(message: OutboundMessage) {
    if (!this.accountSid || !this.authToken || !this.from) {
      throw new Error('WhatsApp outbound messaging requires Twilio credentials.');
    }
    const token = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
    const body = new URLSearchParams({
      From: this.from.startsWith('whatsapp:') ? this.from : `whatsapp:${this.from}`,
      To: message.recipientId.startsWith('whatsapp:') ? message.recipientId : `whatsapp:${message.recipientId}`,
      Body: message.text,
    });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Twilio HTTP ${response.status}: ${await response.text()}`);
  }
}
