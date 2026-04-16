import { getAtprotoOAuthSession, signOutAtprotoSession } from '@/auth/atprotoSession';
import { relayHttpOriginFromEnv } from '@/util/relayHttpOrigin';

let timer: ReturnType<typeof setInterval> | null = null;

export function stopInviteAllowlistWatcher(): void {
  if (timer !== null) {
    clearInterval(timer);
  }
  timer = null;
}

/**
 * Polls relay allowlist while the app runs; signs out and returns to `/` if the user is removed.
 */
export function startInviteAllowlistWatcher(e: ImportMetaEnv = import.meta.env): void {
  stopInviteAllowlistWatcher();
  if (e.VITE_INVITE_ONLY !== '1') {
    return;
  }
  const origin = relayHttpOriginFromEnv(e);
  if (origin === null) {
    return;
  }

  const tick = async (): Promise<void> => {
    const session = getAtprotoOAuthSession();
    const sub = session?.sub?.trim();
    if (session === null || sub === undefined || !sub.startsWith('did:')) {
      return;
    }
    try {
      const r = await fetch(`${origin}/allowlist/v1/check?did=${encodeURIComponent(sub)}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) {
        return;
      }
      const j = (await r.json()) as { allowed?: boolean };
      if (j.allowed !== true) {
        stopInviteAllowlistWatcher();
        await signOutAtprotoSession();
        window.location.href = '/';
      }
    } catch {
      /* transient network — ignore */
    }
  };

  void tick();
  timer = setInterval(() => void tick(), 15_000);
}
