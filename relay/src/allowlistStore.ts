/**
 * KV-backed invite allowlist. When KV is empty, falls back to {@link ATPROTO_ALLOWLIST_DIDS}.
 */
import { parseRelayInviteEnv } from './inviteAllowlist';
import type { RelayInviteContext } from './relayState';

export type AllowlistRow = { readonly did: string; readonly handle: string };
export type PersistedAllowlist = { readonly version: number; readonly entries: AllowlistRow[] };

const KV_KEY = 'allowlist_v1';

export interface AllowlistEnvSlice {
  readonly ATPROTO_ALLOWLIST_DIDS?: string;
  readonly INVITE_ONLY?: string;
}

export async function readPersistedAllowlist(
  kv: KVNamespace | undefined,
): Promise<PersistedAllowlist | null> {
  if (kv === undefined) {
    return null;
  }
  const raw = await kv.get(KV_KEY, 'text');
  if (raw === null || raw === '') {
    return null;
  }
  try {
    const j = JSON.parse(raw) as { version?: unknown; entries?: unknown };
    if (typeof j.version !== 'number' || !Array.isArray(j.entries)) {
      return null;
    }
    const entries: AllowlistRow[] = [];
    for (const e of j.entries) {
      if (typeof e === 'object' && e !== null && typeof (e as { did?: string }).did === 'string') {
        const did = (e as { did: string }).did.trim();
        const handle =
          typeof (e as { handle?: string }).handle === 'string'
            ? (e as { handle: string }).handle.trim()
            : '';
        if (did.startsWith('did:')) {
          entries.push({ did, handle });
        }
      }
    }
    return { version: j.version, entries };
  } catch {
    return null;
  }
}

export function seedRowsFromEnv(env: AllowlistEnvSlice): AllowlistRow[] {
  const { allowedDids } = parseRelayInviteEnv(env);
  return [...allowedDids].map((did) => ({ did, handle: '' }));
}

export type EffectiveAllowlist = {
  readonly version: number;
  readonly entries: AllowlistRow[];
  readonly allowedDids: ReadonlySet<string>;
};

export async function getEffectiveAllowlist(
  kv: KVNamespace | undefined,
  env: AllowlistEnvSlice,
): Promise<EffectiveAllowlist> {
  const persisted = await readPersistedAllowlist(kv);
  if (persisted !== null && persisted.entries.length > 0) {
    const allowedDids = new Set(persisted.entries.map((e) => e.did));
    return {
      version: persisted.version,
      entries: persisted.entries,
      allowedDids,
    };
  }
  const rows = seedRowsFromEnv(env);
  const allowedDids = new Set(rows.map((r) => r.did));
  return { version: 0, entries: rows, allowedDids };
}

export async function writePersistedAllowlist(
  kv: KVNamespace | undefined,
  body: PersistedAllowlist,
): Promise<void> {
  if (kv === undefined) {
    throw new Error('ALLOWLIST_KV not configured');
  }
  await kv.put(KV_KEY, JSON.stringify(body));
}

export async function loadRelayInviteContext(
  kv: KVNamespace | undefined,
  env: AllowlistEnvSlice,
): Promise<RelayInviteContext> {
  const { inviteOnly } = parseRelayInviteEnv(env);
  const eff = await getEffectiveAllowlist(kv, env);
  return { inviteOnly, allowedDids: eff.allowedDids };
}

export async function adminAddEntry(
  kv: KVNamespace | undefined,
  env: AllowlistEnvSlice,
  row: AllowlistRow,
): Promise<EffectiveAllowlist> {
  const cur = await getEffectiveAllowlist(kv, env);
  const map = new Map<string, AllowlistRow>();
  for (const e of cur.entries) {
    map.set(e.did, e);
  }
  map.set(row.did, { did: row.did, handle: row.handle });
  const entries = [...map.values()].sort((a, b) => a.did.localeCompare(b.did));
  await writePersistedAllowlist(kv, { version: cur.version + 1, entries });
  return getEffectiveAllowlist(kv, env);
}

export async function adminRemoveDid(
  kv: KVNamespace | undefined,
  env: AllowlistEnvSlice,
  did: string,
): Promise<EffectiveAllowlist | null> {
  const cur = await getEffectiveAllowlist(kv, env);
  if (!cur.allowedDids.has(did)) {
    return null;
  }
  const entries = cur.entries.filter((e) => e.did !== did);
  await writePersistedAllowlist(kv, { version: cur.version + 1, entries });
  return getEffectiveAllowlist(kv, env);
}
