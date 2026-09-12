import { auditEnterpriseEvent, requirePermission, type EnterpriseRole } from '../security/auditLogger.js';

export type SupportLanguage = 'am' | 'om' | 'en';
export type EscalationReason = 'fraud' | 'high_risk' | 'low_confidence' | 'customer_request' | 'regulated_action';
export interface InquiryClassification { language: SupportLanguage; intent: string; confidence: number; sensitive: boolean; }
export interface EscalationDecision { escalate: boolean; reason?: EscalationReason; queue?: string; priority: 'low' | 'normal' | 'high' | 'critical'; summary: string; }

const languageHints: Record<SupportLanguage, RegExp> = { am: /[\u1200-\u137F]/u, om: /\b(maal|akkam|galatoomi|gargaarsa|herrega)\b/i, en: /[A-Za-z]/ };
export function detectSupportLanguage(text: string): SupportLanguage { if (languageHints.am.test(text)) return 'am'; if (languageHints.om.test(text)) return 'om'; return 'en'; }
export function classifyInquiry(text: string, language = detectSupportLanguage(text)): InquiryClassification {
  const lower = text.toLowerCase();
  const intent = /fraud|scam|stolen|unauthorized|ተጭበርባሪ|hatame/.test(lower) ? 'fraud' : /payment|transfer|balance|የባንክ|herrega/.test(lower) ? 'banking_transaction' : /network|signal|sim|telecom/.test(lower) ? 'telecom_support' : 'general_support';
  return { language, intent, confidence: intent === 'general_support' ? 0.65 : 0.9, sensitive: /pin|password|account|card|bank|otp|የመታወቂያ/i.test(text) };
}

export function decideEscalation(input: { text: string; classification?: InquiryClassification; confidenceThreshold?: number; customerRequestedHuman?: boolean }): EscalationDecision {
  const classification = input.classification || classifyInquiry(input.text);
  const threshold = input.confidenceThreshold ?? 0.7;
  if (input.customerRequestedHuman) return { escalate: true, reason: 'customer_request', queue: 'human-support', priority: 'normal', summary: input.text };
  if (classification.intent === 'fraud') return { escalate: true, reason: 'fraud', queue: 'fraud-review', priority: 'critical', summary: input.text };
  if (classification.sensitive && classification.confidence < threshold) return { escalate: true, reason: 'low_confidence', queue: 'regulated-support', priority: 'high', summary: input.text };
  return { escalate: false, priority: 'normal', summary: input.text };
}

export function escalateToHuman(input: { text: string; actor: string; role: EnterpriseRole; classification?: InquiryClassification; customerRequestedHuman?: boolean }) {
  requirePermission(input.role, 'call:handle');
  const decision = decideEscalation(input);
  auditEnterpriseEvent({ action: 'support_escalation_decision', actor: input.actor, role: input.role, outcome: 'allowed', details: { ...decision } });
  return decision;
}
