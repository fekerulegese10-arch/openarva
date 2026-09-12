export type SensitiveDataType = 'credit_card' | 'bank_account' | 'pin' | 'national_id' | 'email' | 'phone';

export interface Redaction { type: SensitiveDataType; start: number; end: number; replacement: string; }

function luhn(value: string) {
  const digits = value.replace(/\D/g, '');
  let sum = 0;
  let parity = digits.length % 2;
  for (let index = 0; index < digits.length; index += 1) {
    let digit = Number(digits[index]);
    if (index % 2 === parity) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
  }
  return sum % 10 === 0;
}

function mask(type: SensitiveDataType, value: string) {
  if (type === 'credit_card') return `[REDACTED_CREDIT_CARD:${value.replace(/\D/g, '').slice(-4)}]`;
  return `[REDACTED_${type.toUpperCase()}]`;
}

export function findSensitiveData(input: string): Redaction[] {
  const patterns: Array<[SensitiveDataType, RegExp]> = [
    ['credit_card', /\b(?:\d[ -]*?){13,19}\b/g],
    ['bank_account', /\b(?:account|acct|iban|routing)[\s:#-]*[A-Z0-9-]{6,34}\b/gi],
    ['pin', /\b(?:pin|passcode|otp)[\s:#-]*\d{4,8}\b/gi],
    ['national_id', /\b(?:national[ -]?id|tax[ -]?id|ssn|身份证|የመታወቂያ)[\s:#-]*[A-Z0-9-]{5,24}\b/giu],
    ['email', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
    ['phone', /\b(?:\+?\d{1,3}[ -]?)?(?:\(?\d{2,4}\)?[ -]?)?\d{3}[ -]?\d{3,4}[ -]?\d{3,4}\b/g],
  ];
  const redactions: Redaction[] = [];
  for (const [type, pattern] of patterns) {
    for (const match of input.matchAll(pattern)) {
      const value = match[0];
      if (type === 'credit_card' && (!luhn(value) || value.replace(/\D/g, '').length < 13)) continue;
      redactions.push({ type, start: match.index || 0, end: (match.index || 0) + value.length, replacement: mask(type, value) });
    }
  }
  return redactions.sort((left, right) => left.start - right.start).filter((item, index, all) => index === 0 || item.start >= all[index - 1].end);
}

export function sanitizeSensitiveData(input: string) {
  const redactions = findSensitiveData(input);
  let output = input;
  for (let index = redactions.length - 1; index >= 0; index -= 1) {
    const item = redactions[index];
    output = `${output.slice(0, item.start)}${item.replacement}${output.slice(item.end)}`;
  }
  return { text: output, redactions };
}

export function containsSensitiveData(input: string) { return findSensitiveData(input).length > 0; }
