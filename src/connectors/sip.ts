import type { InboundMessage, OutboundMessage } from './gateway.js';

export interface AudioFrame { callId: string; encoding: 'pcm_s16le' | 'mulaw' | 'opus'; sampleRate: number; data: Uint8Array; final?: boolean; }
export interface SpeechToText { transcribe(frame: AudioFrame): Promise<string>; }
export interface TextToSpeech { synthesize(text: string, language: string): Promise<Uint8Array>; }
export interface SipCall { callId: string; caller: string; language?: string; startedAt: string; }

export class SipConnector {
  readonly channel = 'sip' as const;
  private readonly calls = new Map<string, SipCall>();
  constructor(private readonly stt: SpeechToText, private readonly tts: TextToSpeech) {}
  start() { return Promise.resolve(); }
  stop() { this.calls.clear(); return Promise.resolve(); }
  acceptCall(call: SipCall): InboundMessage { this.calls.set(call.callId, call); return { channel: 'sip', senderId: call.caller, text: '', receivedAt: call.startedAt, metadata: { callId: call.callId, language: call.language || 'en' } }; }
  async transcribe(frame: AudioFrame) { return this.stt.transcribe(frame); }
  async synthesize(message: OutboundMessage, language = 'en') { return { ...message, audio: await this.tts.synthesize(message.text, language) }; }
  hangup(callId: string) { return this.calls.delete(callId); }
}
