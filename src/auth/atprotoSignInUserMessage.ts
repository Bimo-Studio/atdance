/**
 * User-visible copy for ATProto OAuth sign-in failures.
 * When errors look like network or upstream overload, say so—users often blame themselves first.
 */

const INFRA_HINT =
  'Sign-in could not reach ATProto or Bluesky right now. Their services are sometimes slow or unavailable during heavy load or outages. This is usually not something you can fix—try again in a few minutes.';

/** Walk `Error.cause` (and similar) so wrapped OAuth errors still match heuristics. */
export function aggregateAtprotoSignInErrorText(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let depth = 0; cur != null && depth < 8; depth += 1) {
    if (cur instanceof Error) {
      const name = cur.name && cur.name !== 'Error' ? `${cur.name}: ` : '';
      if (cur.message) {
        parts.push(`${name}${cur.message}`);
      }
      cur = cur.cause;
    } else if (typeof cur === 'string') {
      parts.push(cur);
      break;
    } else {
      parts.push(String(cur));
      break;
    }
  }
  return parts.join(' ');
}

const INFRA_SUBSTRINGS = [
  'failed to fetch',
  'networkerror',
  'network request failed',
  'load failed',
  '503',
  '502',
  '504',
  '429',
  'timeout',
  'timed out',
  'aborted',
  'econnreset',
  'etimedout',
  'enotfound',
  'bad gateway',
  'service unavailable',
  'gateway timeout',
  'too many requests',
  'rate limit',
  'temporarily unavailable',
  'connection refused',
  'ns_error_connection',
  'err_connection',
  'err_network',
  'err_internet',
  'internal server error',
] as const;

export function isLikelyAtprotoInfrastructureFailure(err: unknown): boolean {
  const text = aggregateAtprotoSignInErrorText(err).toLowerCase();
  if (!text.trim()) {
    return false;
  }
  return INFRA_SUBSTRINGS.some((s) => text.includes(s));
}

function primaryMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function truncate(s: string, max: number): string {
  if (s.length <= max) {
    return s;
  }
  return `${s.slice(0, max - 1)}…`;
}

/**
 * Full line(s) for `textContent` on a sign-in status element.
 */
export function formatAtprotoSignInErrorMessage(err: unknown): string {
  const raw = primaryMessage(err);
  if (isLikelyAtprotoInfrastructureFailure(err)) {
    return `${INFRA_HINT} Technical detail: ${truncate(raw, 200)}`;
  }
  return `Sign-in failed: ${truncate(raw, 220)}`;
}
