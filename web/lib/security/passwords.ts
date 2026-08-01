// Password generation and strength checks.
//
// Why this matters more than the rate limiter: per-IP limits are bypassed by
// an attacker with many IPs, and a global per-site lockout can be abused to
// lock the real client out. Entropy is the defence that actually holds — a
// 16-character random password survives billions of guesses, so the limiter
// only has to stop the casual case.

const AMBIGUOUS_FREE = "abcdefghjkmnpqrstuvwxyz23456789"; // no i/l/o/0/1

/**
 * A strong, readable site password: 16 chars from an unambiguous alphabet,
 * grouped for transcription over the phone. ~79 bits of entropy, which makes
 * distributed guessing hopeless regardless of rate limits.
 */
export function generateSitePassword(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => AMBIGUOUS_FREE[b % AMBIGUOUS_FREE.length]);
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join("")).join("-");
}

/** Passwords so common that any dictionary attack tries them immediately. */
const BLOCKLIST = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890",
  "qwertyui", "qwerty123", "letmein1", "letmein123", "welcome1", "welcome123",
  "admin123", "administrator", "iloveyou", "sunshine", "princess", "football",
  "baseball", "starwars", "whatever", "trustno1", "changeme", "secret123",
  "passw0rd", "p@ssw0rd", "abc12345", "11111111", "00000000", "castorcms",
]);

export interface PasswordVerdict {
  ok: boolean;
  reason?: string;
}

/**
 * Reject passwords that would fall to a dictionary or trivial attack. Kept
 * deliberately modest: the generator is the real answer, and over-strict rules
 * push people toward writing passwords on sticky notes.
 */
export function assessPassword(password: string, minLength: number): PasswordVerdict {
  const pw = password.trim();

  if (pw.length < minLength) {
    return { ok: false, reason: `Use at least ${minLength} characters.` };
  }
  if (BLOCKLIST.has(pw.toLowerCase())) {
    return { ok: false, reason: "That password is far too common — try the generated one." };
  }
  // "aaaaaaaa", "abababab" — long but almost no entropy.
  if (new Set(pw).size < 5) {
    return { ok: false, reason: "Too repetitive — mix in more different characters." };
  }
  // Sequences like "12345678" / "abcdefgh".
  if (/^(?:0123456789|abcdefghijklmnopqrstuvwxyz){1,}/.test(pw.toLowerCase().slice(0, 8))) {
    return { ok: false, reason: "Avoid simple sequences like 12345678." };
  }
  return { ok: true };
}
