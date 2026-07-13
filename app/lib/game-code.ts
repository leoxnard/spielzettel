/**
 * Game codes: 5 characters, uppercase letters + digits without the
 * confusables I, L, O, 0, 1 — easy to read aloud across the table.
 * The DB constraint (`^[A-Z2-9]{5}$`) is intentionally a bit looser.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const CODE_LENGTH = 5;

export function generateCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** Uppercases and strips whitespace; returns null if not a plausible code. */
export function normalizeCode(input: string): string | null {
  const code = input.trim().toUpperCase().replace(/\s+/g, "");
  return /^[A-Z2-9]{5}$/.test(code) ? code : null;
}
