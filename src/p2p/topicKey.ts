/**
 * Hyperswarm topic as 32-byte SHA-256 of UTF-8 label (matches upstream README pattern).
 */
export async function sha256TopicKey(label: string): Promise<Uint8Array> {
  const enc = new TextEncoder().encode(label);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return new Uint8Array(digest);
}
