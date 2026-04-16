# Deploy ATDance for testing: Vercel + Cloudflare (DNS)

**Shoestring / lowest-ops path:** deploy static to **both** Vercel and Cloudflare Pages, pick a winner later — see **`docs/deployment-shoestring.md`**.

This guide assumes **no prior DevOps experience**. You will use:

| Piece                      | Role                                                         |
| -------------------------- | ------------------------------------------------------------ |
| **Vercel**                 | Hosts the **static web app** (HTML/JS from `pnpm build`).    |
| **Cloudflare Workers**     | Hosts the **WebSocket relay** (already in `relay/`).         |
| **DNS (often Cloudflare)** | Points your domain (e.g. `dance.malldao.xyz`) at **Vercel**. |

The **browser** loads the game from Vercel and opens **`wss://…`** to the Worker. They are separate services; that is normal.

**P2P note:** Sync Lab **Mode B** (`?sync=p2p`) uses **hyperswarm-web** + **`VITE_P2P_BOOTSTRAP`** and does **not** require this Worker. The Worker remains **Mode A** / dev / legacy pairing — see **`docs/architecture-p2p-holepunch.md`**.

---

## 0. What you need

1. **GitHub** (or GitLab/Bitbucket) — Vercel deploys from git.
2. **Vercel account** — [vercel.com](https://vercel.com), sign up with GitHub.
3. **Cloudflare account** — [cloudflare.com](https://www.cloudflare.com) (free tier is enough to start).
4. **Optional:** A domain (e.g. `malldao.xyz`) whose **DNS you control**. Cloudflare as registrar or “DNS only” both work.

---

## 1. Recommended order

1. Deploy the **relay Worker** first → you get a stable **`wss://`** URL.
2. Deploy the **Vite app on Vercel** → set **`VITE_RELAY_WS`** to that URL.
3. **Test** on the default `*.vercel.app` URL (no DNS yet).
4. **Optional:** Add a **custom hostname** (e.g. `dance.malldao.xyz`) in Vercel and create **DNS records**.

---

## 2. Cloudflare: deploy the relay (WebSocket)

The relay is **not** deployed by Vercel. It is a **Cloudflare Worker** in `relay/`, uploaded with **Wrangler** (Cloudflare’s official CLI for Workers).

### 2.1 What Wrangler is (and where this repo wires it)

| Concept                 | Detail                                                                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wrangler**            | CLI that talks to your Cloudflare account and **uploads** Worker code to Cloudflare’s network.                                                           |
| **How you run it here** | Through **`pnpm`**, using the `wrangler` version in `devDependencies`. You do **not** need `npm install -g wrangler` unless you prefer a global install. |
| **Config file**         | `relay/wrangler.toml` — defines Worker name (`atdance-relay`), entry `relay/src/index.ts`, compatibility date.                                           |
| **pnpm scripts**        | `pnpm relay:deploy` → `wrangler deploy --config relay/wrangler.toml`. `pnpm relay:dev` → `wrangler dev --config relay/wrangler.toml`.                    |

All commands below assume a **terminal open at the repository root** (the directory that contains `package.json` and the `relay/` folder).

### 2.2 One-time: install dependencies and log in

1. Install JS deps (including Wrangler):

   ```bash
   pnpm install
   ```

2. Log Wrangler into Cloudflare (browser OAuth):

   ```bash
   pnpm exec wrangler login
   ```

3. Confirm the CLI sees your account:

   ```bash
   pnpm exec wrangler whoami
   ```

   You should see your Cloudflare email / account id. If this fails, fix login before deploying.

**Help:** `pnpm exec wrangler --help` lists subcommands. Official docs: [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) and `pnpm exec wrangler docs` for in-browser help.

### 2.3 Deploy the relay to Cloudflare

From the **repo root**:

```bash
pnpm relay:deploy
```

That is equivalent to:

```bash
pnpm exec wrangler deploy --config relay/wrangler.toml
```

Wrangler prints a deploy summary and a **public URL** for the Worker. The Worker name comes from `relay/wrangler.toml` (`name = "atdance-relay"`).

### 2.4 Copy your Worker URL for `VITE_RELAY_WS`

After deploy, Wrangler prints a URL. Typical shape:

- **`https://atdance-relay.<your-subdomain>.workers.dev`**

WebSockets use the **same host** with **`wss:`**:

- **`wss://atdance-relay.<your-subdomain>.workers.dev`**

Save this — you will paste it into Vercel as **`VITE_RELAY_WS`** (next section).

### 2.5 Local relay only (optional, for development)

**Not** a production deploy — runs the Worker on your machine:

```bash
pnpm relay:dev
```

Sync Lab in the app (title **T**) should talk to **`ws://127.0.0.1:8787`** (Wrangler’s default dev port). Production builds use **`VITE_RELAY_WS`** only.

### 2.6 Other Wrangler commands you may use later

| Goal                                          | Command                                                       |
| --------------------------------------------- | ------------------------------------------------------------- |
| See all subcommands                           | `pnpm exec wrangler` (no args) or `pnpm exec wrangler --help` |
| Deploy help                                   | `pnpm exec wrangler deploy --help`                            |
| List deployments                              | `pnpm exec wrangler deployments --config relay/wrangler.toml` |
| Stream live logs from the **deployed** Worker | `pnpm exec wrangler tail --config relay/wrangler.toml`        |
| Open Wrangler docs in browser                 | `pnpm exec wrangler docs`                                     |
| Log out (switch account)                      | `pnpm exec wrangler logout` then `wrangler login` again       |

### 2.7 Wrangler troubleshooting

| Symptom                                        | What to try                                                                                                |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `wrangler login` opens browser but still fails | Run `pnpm exec wrangler logout`, then `pnpm exec wrangler login` again.                                    |
| Wrong Cloudflare account                       | `pnpm exec wrangler whoami` — if wrong, use `logout` / `login` with the correct account.                   |
| Deploy says permission / account error         | Ensure the logged-in user has **Workers** access on that account (Cloudflare dashboard → Workers & Pages). |
| Forgot `wss://` for Vite                       | Use **`wss://`** (same host as `https://`, scheme `wss` not `https`).                                      |

### 2.8 Custom hostname for the relay (`relay.malldao.xyz`) with **manual** DNS

**`workers.dev`** is the default URL (e.g. `https://atdance-relay.your-subdomain.workers.dev`). This section uses your own subdomain on **`malldao.xyz`**, but **you** create the DNS record in the Cloudflare dashboard. The repo uses a **[Worker Route](https://developers.cloudflare.com/workers/configuration/routing/routes/)** (not “Custom Domains,” which auto-create DNS).

**What’s in code (already set)**

`relay/wrangler.toml` maps the Worker to:

- Pattern: **`relay.malldao.xyz/*`**
- Zone: **`malldao.xyz`**

Deploy with **`pnpm relay:deploy`** after DNS exists (see order below).

**What you do on Cloudflare (websites / dashboard)**

1. **Same account** as `wrangler login`: zone **`malldao.xyz`** must be in this account ([active zone](https://developers.cloudflare.com/dns/zone-setups/)).
2. **DNS (manual):** Cloudflare requires a **proxied** (orange cloud) record for `relay` before traffic can hit a [route](https://developers.cloudflare.com/workers/configuration/routing/routes/). Typical setup for a Worker-only host:
   - **Dashboard:** `malldao.xyz` → **DNS** → **Records** → **Add record**
   - **Type:** **AAAA**
   - **Name:** `relay`
   - **IPv6 address:** `100::` (reserved discard prefix; no real origin server behind the Worker)
   - **Proxy status:** **Proxied** (must be orange cloud)
3. **Deploy the Worker route:** from repo root, **`pnpm relay:deploy`**. That registers the route in Wrangler; it does **not** create the DNS row for you.

**Optional dashboard check:** [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) → **atdance-relay** → **Settings** → **Domains & Routes** — you should see a route for `relay.malldao.xyz/*` after a successful deploy.

**If `wrangler deploy` complains about the zone**

- Confirm **`pnpm exec wrangler whoami`** is the account that owns **`malldao.xyz`**.
- You can replace `zone_name` with **`zone_id`** in `relay/wrangler.toml` (Zone ID is on the zone **Overview** in the dashboard).

**TLS**

HTTPS/WSS for proxied hostnames on your zone is handled by Cloudflare’s edge certificates once DNS is proxied and the route is live.

**Frontend env**

Set **`VITE_RELAY_WS=wss://relay.malldao.xyz`** and redeploy the Vite app (Vite inlines env at build time).

**If you do not want this hostname yet**

Remove the `[[routes]]` block from `relay/wrangler.toml` and use the **`wss://…workers.dev`** URL from §2.4.

**Note:** Cloudflare’s docs often recommend **[Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)** when the Worker is the only origin (they manage DNS for you). This project intentionally uses **Routes + manual DNS** so you keep full control of DNS records.

---

## 3. Vercel: deploy the static app

### 3.1 Import the project

1. In Vercel: **Add New… → Project**.
2. **Import** your Git repository.
3. Vercel should detect **Vite** (or use **Framework Preset: Vite**).

### 3.2 Build settings (if asked)

| Setting              | Value                                                                          |
| -------------------- | ------------------------------------------------------------------------------ |
| **Install Command**  | `pnpm install` (often auto from lockfile / `packageManager` in `package.json`) |
| **Build Command**    | `pnpm build`                                                                   |
| **Output Directory** | `dist`                                                                         |
| **Root Directory**   | `.` (repo root)                                                                |

The repo includes **`vercel.json`** (Vite + `pnpm` + `dist`). Do **not** add a blanket “SPA rewrite everything to `index.html`” rule here: demo charts live under **`/songs/...`** as static files and must keep being served as files.

### 3.3 Environment variables (required for Sync Lab)

In the project: **Settings → Environment Variables**.

Add:

| Name                | Example                                          | Environments                           |
| ------------------- | ------------------------------------------------ | -------------------------------------- |
| **`VITE_RELAY_WS`** | `wss://atdance-relay.your-subdomain.workers.dev` | Production, Preview, Development (all) |

**Important:** Vite **bakes** `VITE_*` into the JS at **build time**. After changing this variable, **redeploy** (or trigger a new build).

Optional (only if you test **logged-in PDS** flows):

| Name                        | Example                        |
| --------------------------- | ------------------------------ |
| **`VITE_ATPROTO_PDS_HOST`** | `https://your-pds.example.com` |

### 3.4 Deploy

Save and deploy. Open the **`*.vercel.app`** URL.

**Smoke test:** Title → **T** (Sync Lab) → should connect to the Worker URL you set. If it fails, see [Troubleshooting](#7-troubleshooting).

---

## 4. DNS: use your own domain (optional)

Example: **`dance.malldao.xyz`** → Vercel.

### 4.1 Add domain in Vercel

1. **Project → Settings → Domains**.
2. Add **`dance.malldao.xyz`** (or your subdomain).
3. Vercel shows **exactly** which DNS record(s) to create. Follow **their** instructions (they may differ slightly by account).

Typically you will add **one** of:

- **CNAME** `dance` → `cname.vercel-dns.com` (or similar), **or**
- **A** record to Vercel’s IPs — only if Vercel asks for A instead of CNAME.

### 4.2 Create the record in Cloudflare DNS

If the domain uses **Cloudflare DNS**:

1. **Cloudflare Dashboard** → your zone → **DNS** → **Records**.
2. **Add record** as Vercel instructs (usually **CNAME**, name `dance`, target from Vercel).
3. **Proxy status:** For a static site on Vercel, **DNS only** (grey cloud) is often simplest for “first success”; you can switch to proxied (orange) later if you understand the tradeoffs. If something breaks, try **DNS only** first.

### 4.3 Wait for SSL

Vercel issues HTTPS automatically after DNS propagates (often minutes; sometimes up to 24–48 hours for DNS caches).

### 4.4 OAuth / ATProto (if you use sign-in)

OAuth **redirect URIs** must match the URLs where the app runs. After you have a stable URL:

- Add **`https://dance.malldao.xyz/...`** (and preview URLs if needed) to whatever **OAuth client metadata** your PDS / IdP requires.

The app emits **`/oauth-client-metadata.json`** at build time (see `oauthClientMetadata.ts` + Vite plugin). The **authorization server** (e.g. Bluesky) **fetches that URL over HTTPS** to validate your client before **`/oauth/par`**. That request **must return 200** with JSON — **without** a logged-in browser session.

**Vercel Preview + “Unauthorized” / `invalid_client_metadata`:** If **Deployment Protection** (password, SSO, or [Vercel Authentication](https://vercel.com/docs/security/deployment-protection)) is on, **server-side** fetches to `https://*.vercel.app/oauth-client-metadata.json` often get **401**. Turn **off** protection for the environment where you test OAuth, or test on a **public** deployment (e.g. Production on a custom domain without protection). Verify with:

`curl -sI "https://YOUR-HOST/oauth-client-metadata.json"` — expect **`200`**, not **`401`**.

Follow [@atproto/oauth-client-browser](https://github.com/bluesky-social/oauth-client-browser) for metadata shape. Anonymous play does not need OAuth.

---

## 5. Where things live (mental model)

```
User’s browser
    │
    ├─ HTTPS GET  →  Vercel          (HTML + JS + static assets)
    │
    └─ WSS        →  Cloudflare Worker  (relay: ping/pong, queue, etc.)
```

**CORS** is not the same as WebSockets; the Worker must accept WebSocket upgrades (your `relay` code already does). **Mixed content:** the page is HTTPS, so the relay must be **`wss://`**, not `ws://`.

---

## 6. Verify checklist

- [ ] If using **`relay.malldao.xyz`**: manual **AAAA** `relay` → `100::` **proxied** in Cloudflare DNS, then **`pnpm relay:deploy`** succeeds.
- [ ] You have a relay URL (**`wss://…workers.dev`** and/or **`wss://relay.malldao.xyz`**) matching what you put in Vercel.
- [ ] Vercel project has **`VITE_RELAY_WS`** set for Preview + Production.
- [ ] New deployment after setting env (rebuild).
- [ ] Sync Lab (**T**) shows connection / samples on the deployed site.
- [ ] (Optional) Custom domain resolves and HTTPS works in the browser.

---

## 7. Troubleshooting

| Symptom                                                                              | Things to check                                                                                                                                             |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sync Lab never connects                                                              | **`VITE_RELAY_WS`** wrong or missing; typo (`wss` not `https`). Redeploy after env change.                                                                  |
| Works locally, not on Vercel                                                         | Production build has **no** dev default relay; env must be set on Vercel.                                                                                   |
| OAuth fails on production                                                            | Redirect URI / client metadata not updated for the **new** hostname.                                                                                        |
| `invalid_client_metadata` / **Unauthorized** fetching `…/oauth-client-metadata.json` | **Deployment Protection** on Vercel (or similar) blocking **server** fetches — disable for that env or use a public URL; confirm with `curl -sI` → **200**. |
| `inject.js` / `content.js` / JSON-RPC **`32603`**                                    | Usually a **browser extension**, not ATDance — ignore or test in a clean profile.                                                                           |
| 404 on `/songs/...`                                                                  | Path wrong or rewrite misconfiguration; default `vercel.json` does **not** rewrite `/songs`.                                                                |

---

## 8. Changing the Worker name or domain later

- **Worker:** `relay/wrangler.toml` → `name = "…"`. Redeploy; **update `VITE_RELAY_WS`** and redeploy the frontend.
- **Relay hostname (route):** edit `[[routes]]` `pattern` / `zone_name` (or `zone_id`), adjust **DNS** in the zone if the hostname changes, then **`pnpm relay:deploy`**.
- **Vercel env:** always **redeploy** the app after changing `VITE_*`.

---

_This doc is for testing and staging. Hardening (monitoring, alerts, rate limits review) is covered at a high level in `docs/operator-runbook.md`._
