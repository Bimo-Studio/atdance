/**
 * Normalize handle text for ATProto OAuth `signInRedirect` / `signIn`.
 * The bundled identity resolver rejects strings that still contain a leading `@`
 * (`@atproto-labs/identity-resolver` / `asNormalizedHandle`).
 */
export function normalizeAtprotoHandleInput(raw: string): string {
  return raw.trim().replace(/^@+/, '');
}
