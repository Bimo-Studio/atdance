/**
 * Random topic material for public topics (PRD P3.4 — no secrets in topic strings).
 */

/** Hex-encoded random bytes suitable for a shared topic / room key display. */
export function randomTopicHex(byteLength = 16): string {
  const b = new Uint8Array(byteLength);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}
