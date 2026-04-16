import type { OAuthSession } from '@atproto/oauth-client-browser';

type SessionWithTokenSet = OAuthSession & {
  getTokenSet(refresh?: boolean | 'auto'): Promise<{
    access_token: string;
    token_type: string;
  }>;
};

export async function getOAuthAccessTokenForRelay(
  session: OAuthSession,
): Promise<{ headerValue: string } | null> {
  try {
    const s = session as SessionWithTokenSet;
    const ts = await s.getTokenSet(false);
    const t = ts.token_type?.trim() || 'Bearer';
    return { headerValue: `${t} ${ts.access_token}` };
  } catch {
    return null;
  }
}
