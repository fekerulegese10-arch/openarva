import type { AudioFrame, SpeechToText, TextToSpeech } from './sip.js';

export type SupportedCallLanguage = 'am' | 'om' | 'en';
export interface TelephonySession { callId: string; language: SupportedCallLanguage; transcript: string[]; }

export class TelephonyPipeline {
  private readonly sessions = new Map<string, TelephonySession>();
  constructor(private readonly stt: SpeechToText, private readonly tts: TextToSpeech) {}
  open(callId: string, language: SupportedCallLanguage = 'en') { const session = { callId, language, transcript: [] }; this.sessions.set(callId, session); return session; }
  async processAudio(frame: AudioFrame) { const session = this.sessions.get(frame.callId); if (!session) throw new Error(`Unknown telephony session: ${frame.callId}`); const text = await this.stt.transcribe(frame); if (text) session.transcript.push(text); return text; }
  async speak(callId: string, text: string) { const session = this.sessions.get(callId); if (!session) throw new Error(`Unknown telephony session: ${callId}`); return this.tts.synthesize(text, session.language); }
  close(callId: string) { return this.sessions.delete(callId); }
}
