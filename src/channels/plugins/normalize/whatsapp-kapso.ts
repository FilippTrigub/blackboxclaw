/**
 * WhatsApp-Kapso normalization utilities
 * 
 * Normalizes phone numbers and messaging targets for WhatsApp via Kapso.ai
 * Similar to Telegram normalization but for E.164 phone numbers
 */

/**
 * Normalize a phone number to E.164 format for WhatsApp
 * E.164 format: +[country code][number] (e.g., +14155551234)
 * 
 * @param raw - Raw phone number input
 * @returns Normalized phone number or undefined if invalid
 */
export function normalizeWhatsAppKapsoTarget(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  // Remove whatsapp: prefix if present
  let normalized = trimmed;
  if (normalized.toLowerCase().startsWith("whatsapp:")) {
    normalized = normalized.slice("whatsapp:".length).trim();
  }

  if (!normalized) {
    return undefined;
  }

  // Remove all non-digit characters except leading +
  const hasPlus = normalized.startsWith("+");
  const digits = normalized.replace(/\D/g, "");

  if (!digits) {
    return undefined;
  }

  // E.164 format requires + prefix
  const e164 = hasPlus || digits.length > 10 ? `+${digits}` : `+1${digits}`;

  // Basic validation: E.164 numbers are 7-15 digits (excluding +)
  const digitCount = e164.slice(1).length;
  if (digitCount < 7 || digitCount > 15) {
    return undefined;
  }

  return e164;
}

/**
 * Normalize WhatsApp messaging target for outbound messages
 * 
 * @param raw - Raw target identifier
 * @returns Normalized target or undefined
 */
export function normalizeWhatsAppKapsoMessagingTarget(raw: string): string | undefined {
  return normalizeWhatsAppKapsoTarget(raw);
}

/**
 * Check if a string looks like a WhatsApp target ID
 * 
 * @param raw - String to check
 * @returns True if it looks like a phone number or WhatsApp ID
 */
export function looksLikeWhatsAppKapsoTargetId(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) {
    return false;
  }

  // Check for whatsapp: prefix
  if (/^whatsapp:/i.test(trimmed)) {
    return true;
  }

  // Check for phone number pattern (with or without +)
  // Must have at least 7 digits
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

/**
 * Extract phone number from WhatsApp JID format
 * WhatsApp JIDs are in format: [phone]@s.whatsapp.net
 * 
 * @param jid - WhatsApp JID
 * @returns Phone number in E.164 format or undefined
 */
export function extractPhoneFromJID(jid: string): string | undefined {
  if (!jid) {
    return undefined;
  }

  // Extract phone number before @
  const match = jid.match(/^(\+?\d+)@/);
  if (!match) {
    return undefined;
  }

  return normalizeWhatsAppKapsoTarget(match[1]);
}

/**
 * Convert phone number to WhatsApp JID format
 * 
 * @param phone - Phone number in E.164 format
 * @returns WhatsApp JID
 */
export function phoneToJID(phone: string): string {
  const normalized = normalizeWhatsAppKapsoTarget(phone);
  if (!normalized) {
    throw new Error(`Invalid phone number: ${phone}`);
  }

  // Remove + for JID format
  const digits = normalized.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}
