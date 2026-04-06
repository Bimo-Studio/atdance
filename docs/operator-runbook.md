# Operator runbook (ATDance)

Plan Phase 5.3 — tasks for people deploying and operating the stack.

## Secrets and config

- **Never commit** PDS URLs with live credentials, OAuth client secrets, or relay signing keys. Use `.env.local` (gitignored) and your host’s secret store for production.
- **Client env** uses the `VITE_` prefix; only non-secret public endpoints belong there. See root `.env.example`.

## Rotate OAuth / ATProto client metadata

1. Issue new OAuth client credentials with your IdP / PDS as required by your deployment.
2. Update **hosted client metadata** (or DCR registration) so `dance.malldao.xyz` matches the new client id and redirect URIs.
3. Deploy the static app; users with old sessions may need to sign in again after token expiry.

## Update the Cloudflare relay Worker

1. From repo root: `pnpm relay:deploy` (uses `relay/wrangler.toml`).
2. Confirm **WebSocket** URL in production matches `VITE_RELAY_WS` used at **build** time (rebuild the static app if the URL changed).
3. **In-memory** queue/rooms reset on Worker cold start; document incidents if users report dropped pairings during deploys.

## Clear KV / rate-limit state (if added later)

This MVP uses **in-memory** rate limiting in the Worker. If you move limits to **KV**:

1. Document the KV namespace binding name in `relay/wrangler.toml`.
2. To reset abuse counters, delete keys by prefix in the Cloudflare dashboard or `wrangler kv` CLI (follow current Cloudflare docs).

## Monitoring hooks

- Use Cloudflare **Workers analytics** and **Pages** analytics for traffic and errors.
- Client-side: watch browser console and network for failed chart/audio fetches and WebSocket closes (Sync Lab).
