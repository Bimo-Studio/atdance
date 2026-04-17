/**
 * Single-line footer for “signed-in account” UI (lobby, etc.).
 * Prefer resolved ATProto handle; fall back to shortened DID.
 */
export function formatAccountFooterLine(did: string, handle: string | null): string {
  if (handle !== null && handle !== '') {
    const h = handle.startsWith('@') ? handle.slice(1) : handle;
    return `Account: @${h}`;
  }
  const short = did.length > 36 ? `${did.slice(0, 28)}…` : did;
  return `Account: ${short}`;
}
