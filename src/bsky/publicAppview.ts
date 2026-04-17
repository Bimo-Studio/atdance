/**
 * Public AppView / identity XRPC (no auth). Shared by relay Worker and admin UI.
 */
const PUBLIC_API = 'https://public.api.bsky.app';

export interface BskyPublicProfile {
  handle: string | null;
  avatarUrl: string | null;
}

export async function fetchBskyPublicProfileForDid(did: string): Promise<BskyPublicProfile | null> {
  const url = new URL(`${PUBLIC_API}/xrpc/app.bsky.actor.getProfile`);
  url.searchParams.set('actor', did);
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) {
    return null;
  }
  const j = (await r.json()) as { handle?: string; avatar?: string };
  const handle = typeof j.handle === 'string' ? j.handle.toLowerCase() : null;
  const avatarUrl = typeof j.avatar === 'string' && j.avatar.startsWith('http') ? j.avatar : null;
  return { handle, avatarUrl };
}

export async function fetchBskyAvatarUrlForDid(did: string): Promise<string | null> {
  const p = await fetchBskyPublicProfileForDid(did);
  return p?.avatarUrl ?? null;
}

export async function fetchBskyHandleForDid(did: string): Promise<string | null> {
  const p = await fetchBskyPublicProfileForDid(did);
  return p?.handle ?? null;
}

export async function resolveAtHandleToDid(handle: string): Promise<string | null> {
  const h = handle.trim().replace(/^@/, '');
  if (h === '') {
    return null;
  }
  const url = new URL(`${PUBLIC_API}/xrpc/com.atproto.identity.resolveHandle`);
  url.searchParams.set('handle', h);
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) {
    return null;
  }
  const j = (await r.json()) as { did?: string };
  return typeof j.did === 'string' && j.did.startsWith('did:') ? j.did : null;
}

export interface TypeaheadActor {
  did: string;
  handle: string;
}

export async function searchActorsTypeahead(q: string, limit = 8): Promise<TypeaheadActor[]> {
  const qq = q.replace(/^@/, '').trim();
  if (qq.length < 2) {
    return [];
  }
  const url = new URL(`${PUBLIC_API}/xrpc/app.bsky.actor.searchActorsTypeahead`);
  url.searchParams.set('q', qq);
  url.searchParams.set('limit', String(limit));
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) {
    return [];
  }
  const j = (await r.json()) as { actors?: { did: string; handle: string }[] };
  const actors = j.actors ?? [];
  return actors
    .filter((a) => typeof a.did === 'string' && typeof a.handle === 'string')
    .map((a) => ({ did: a.did, handle: a.handle.toLowerCase() }));
}
