import { describe, expect, it } from 'vitest';
import { MultiChannelGateway, type GatewayConnector, type InboundMessage, type OutboundMessage } from './gateway.js';
import { WhatsAppConnector } from './whatsapp.js';

const whatsapp = new WhatsAppConnector();

class FakeConnector implements GatewayConnector {
  readonly channel = 'telegram' as const;
  sent: OutboundMessage[] = [];

  async start() {}
  async stop() {}
  async send(message: OutboundMessage) {
    this.sent.push(message);
  }
}

describe('multi-channel gateway', () => {
  it('routes inbound messages through the agent and sends the response back', async () => {
    const connector = new FakeConnector();
    const gateway = new MultiChannelGateway({
      agent: { respond: async (text) => `reply:${text}` },
      connectors: [connector],
    });

    const inbound: InboundMessage = {
      channel: 'telegram',
      senderId: 'chat-1',
      text: 'hello',
      receivedAt: new Date().toISOString(),
    };

    await gateway.route(inbound);

    expect(connector.sent).toHaveLength(1);
    expect(connector.sent[0]).toMatchObject({
      channel: 'telegram',
      recipientId: 'chat-1',
      text: 'reply:hello',
      replyTo: inbound,
    });
  });
});
