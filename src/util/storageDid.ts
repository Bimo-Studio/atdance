import { getAtprotoOAuthSession } from '@/auth/atprotoSession';
import { isE2eMode } from '@/util/e2eFlags';

/**
 * Stable synthetic DID segment for Playwright when `?e2e=1` (no OAuth session).
 * Use `?e2e_did=<token>` to isolate storage (alphanumeric, `.`, `_`, `-` only).
 */
export function e2eStorageDidFromSearch(search: string): string {
  const q = search.startsWith('?') ? search.slice(1) : search;
  const raw = new URLSearchParams(q).get('e2e_did')?.trim();
  const suffix = raw && /^[a-zA-Z0-9._-]+$/.test(raw) ? raw : '1';
  return `did:web:e2e.atdance.local#${suffix}`;
}

/**
 * DID namespace for `idb-keyval` stores (magnets, song priority).
 * In e2e mode, uses {@link e2eStorageDidFromSearch}; otherwise the ATProto session DID.
 */
export function getStorageDid(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  if (isE2eMode()) {
    return e2eStorageDidFromSearch(window.location.search);
  }
  const sub = getAtprotoOAuthSession()?.sub?.trim();
  return sub?.startsWith('did:') ? sub : '';
}
