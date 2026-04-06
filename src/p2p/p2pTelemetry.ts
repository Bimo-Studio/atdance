/**
 * P3.2 — privacy-safe telemetry labels (no raw IPs / SDP in user-visible logs).
 */

export function safeIceFailureLabel(reason: string): string {
  const cleaned = reason
    .replace(/[^a-zA-Z0-9 _.-]/g, '')
    .trim()
    .slice(0, 64);
  return cleaned.length > 0 ? `ice_failure:${cleaned}` : 'ice_failure:unknown';
}
