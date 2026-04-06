# Deploy ATDance for testing: Vercel + Cloudflare (DNS)

This guide assumes **no prior DevOps experience**. You will use:

| Piece                      | Role                                                         |
| -------------------------- | ------------------------------------------------------------ |
| **Vercel**                 | Hosts the **static web app** (HTML/JS from `pnpm build`).    |
| **Cloudflare Workers**     | Hosts the **WebSocket relay** (already in `relay/`).         |
| **DNS (often Cloudflare)** | Points your domain (e.g. `dance.malldao.xyz`) at **Vercel**. |

The **browser** loads the game from Vercel and opens **`wss://…`** to the Worker. They are separate services; that is normal.

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

The relay is **not** deployed by Vercel. It uses Wrangler.

### 2.1 Install CLI and log in (one machine)

```bash
pnpm install
pnpm exec wrangler login
```

This opens a browser to authorize Wrangler against your Cloudflare account.

### 2.2 Deploy

From the **repo root**:

```bash
pnpm relay:deploy
```

Wrangler uses `relay/wrangler.toml` (`name = "atdance-relay"`).

### 2.3 Copy your Worker URL

After deploy, Wrangler prints a URL. Typical shape:

- **`https://atdance-relay.<your-subdomain>.workers.dev`**

WebSockets use the **same host** with **`wss:`**:

- **`wss://atdance-relay.<your-subdomain>.workers.dev`**

Save this — you will paste it into Vercel as **`VITE_RELAY_WS`** (next section).

### 2.4 Local check (optional)

```bash
pnpm relay:dev
```

Sync Lab in the app (title **T**) should talk to `ws://127.0.0.1:8787` in dev. Production builds use **`VITE_RELAY_WS`** only.

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

The app uses `BrowserOAuthClient` without embedded `clientMetadata` in code; **production** setups often need **hosted client metadata** — follow [@atproto/oauth-client-browser](https://github.com/bluesky-social/oauth-client-browser) docs for your PDS. Anonymous play does not need this.

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

- [ ] `pnpm relay:deploy` succeeds; you have a **`wss://…workers.dev`** URL.
- [ ] Vercel project has **`VITE_RELAY_WS`** set for Preview + Production.
- [ ] New deployment after setting env (rebuild).
- [ ] Sync Lab (**T**) shows connection / samples on the deployed site.
- [ ] (Optional) Custom domain resolves and HTTPS works in the browser.

---

## 7. Troubleshooting

| Symptom                      | Things to check                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| Sync Lab never connects      | **`VITE_RELAY_WS`** wrong or missing; typo (`wss` not `https`). Redeploy after env change.   |
| Works locally, not on Vercel | Production build has **no** dev default relay; env must be set on Vercel.                    |
| OAuth fails on production    | Redirect URI / client metadata not updated for the **new** hostname.                         |
| 404 on `/songs/...`          | Path wrong or rewrite misconfiguration; default `vercel.json` does **not** rewrite `/songs`. |

---

## 8. Changing the Worker name or domain later

- **Worker:** `relay/wrangler.toml` → `name = "…"`. Redeploy; **update `VITE_RELAY_WS`** and redeploy the frontend.
- **Vercel env:** always **redeploy** the app after changing `VITE_*`.

---

_This doc is for testing and staging. Hardening (monitoring, alerts, rate limits review) is covered at a high level in `docs/operator-runbook.md`._
