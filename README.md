# ATDance

Browser rhythm game for **dance.malldao.xyz**. See `plan.md` for the full roadmap.

## Requirements

- Node.js 20+
- [pnpm](https://pnpm.io/)

## Commands

| Command              | Description                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`       | Install dependencies                                                                                                                                    |
| `pnpm dev`           | Vite dev server — title → **song select** (minimal, SynRG, 6jan, Forkbomb); chart + audio bytes cache in **IndexedDB** (`idb-keyval`) after first fetch |
| `pnpm build`         | Typecheck + production bundle                                                                                                                           |
| `pnpm test`          | Vitest (unit tests under `src/**/*.test.ts` and `relay/**/*.test.ts`). Layered test **plans**: `docs/test-plans.md`.                                    |
| `pnpm test:coverage` | Vitest with coverage report; **CI** enforces **≥ 50%** lines/statements (see `vitest.config.ts`).                                                       |
| `pnpm e2e`           | Playwright smoke against **`vite preview`** (run `pnpm build` first). Installs browsers once with `pnpm e2e:install` (`playwright install chromium`).   |
| `pnpm lint`          | ESLint                                                                                                                                                  |
| `pnpm format`        | Prettier write                                                                                                                                          |
| `pnpm relay:dev`     | Cloudflare Worker — WebSocket **ping/pong** clock sync (NTP-style); use with **Sync Lab** (title **T**)                                                 |

## Architecture (high level)

```
┌──────────────────┐   wss (sync)    ┌─────────────────────┐
│  Browser (Vite)  │ ◄──────────────► │ Cloudflare Worker   │
│  Phaser + audio  │                 │ relay (queue/rooms) │
└────────┬─────────┘                 └─────────────────────┘
         │ HTTPS
         ▼
┌──────────────────┐                 ┌─────────────────────┐
│ Static host/CDN  │                 │ Self-hosted PDS     │
│ charts + audio   │                 │ (OAuth, ATProto)    │
└──────────────────┘                 └─────────────────────┘
```

- **Single-player** timing uses the **Web Audio** clock; **calibration** adjusts tap offset.
- **Sync Lab** proves **NTP-style** offset/RTT over the relay; not real-time versus play (see `plan.md`).
- **Direction:** move multiplayer/sync transport toward **Holepunch-style P2P** (topics, encrypted streams) **in the browser** — see **`docs/architecture-p2p-holepunch.md`**. The Worker relay remains available during migration.

## Environment variables

Copy `.env.example` to `.env.local` for local overrides. Important `VITE_` vars:

| Variable                | Purpose                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_RELAY_WS`         | Relay WebSocket URL (`wss://…`) for production/staging builds (Sync Lab, **Mode A** legacy).                                                    |
| `VITE_P2P_BOOTSTRAP`    | Comma-separated or JSON array of `wss://` / `ws://` URLs for **hyperswarm-web** proxy/signal (Sync Lab **Mode B**). See `docs/prd-p2p-sync.md`. |
| `VITE_ATPROTO_PDS_HOST` | Self-hosted PDS / handle resolver base URL when enabling OAuth + score writes.                                                                  |

## Local relay

```bash
pnpm relay:dev
```

Default dev URL is typically `ws://127.0.0.1:8787` (see Wrangler output). Point **Sync Lab** at it via `VITE_RELAY_WS` before `pnpm dev` or `pnpm build` when testing against a deployed Worker.

## Local PDS (writes)

This repo does not ship `docker-compose` for a PDS. For self-hosting, follow the official **PDS** deployment guide (e.g. [bluesky-social/pds](https://github.com/bluesky-social/pds)) and set `VITE_ATPROTO_PDS_HOST` to your instance.

## Commits & releases

- **Conventional Commits** are required (enforced by [Commitlint](https://commitlint.js.org/) on `commit-msg` and on pull requests in CI). Examples: `feat: add calibration scene`, `fix: correct hit window`, `chore: bump deps`.
- **Releases** use [release-please](https://github.com/googleapis/release-please) via [release-please-action](https://github.com/googleapis/release-please-action) (`.github/workflows/release.yml`). On pushes to `main` / `master` it opens or updates a **release PR** that bumps `package.json` and `CHANGELOG.md` from those commits. **Merging that PR** creates the GitHub Release and tag. This repo does **not** publish to npm; add a separate workflow later if you need a registry publish.

### Playfield query params

- `?judge=beat` — pydance-style **BeatJudge** (tick windows from BPM).
- `?chart=1` — second chart block in a multi-`SINGLE` file (e.g. MANIAC in `synrg.dance`).
- `?e2e=1` — **Playwright / smoke:** skip title, land on **song select**; drives `#e2e-status` milestones (minimal fixture avoids long audio fetch).
- `?e2e=1&sync_lab=1` — boot to **Sync Lab** (relay); add **`&sync=p2p`** for P2P mode — CI asserts `#e2e-status` is `sync-lab-relay` or `sync-lab-p2p` (see `e2e/syncLab.spec.ts`).

### Calibration

On the title screen press **C** (or start the **Calibration** scene): eight 120 BPM beeps, tap **SPACE** or **click** on each beat. The median offset is stored in `localStorage` (`atdance.calibrationOffsetSec`) and applied in **PlayScene** so judging and note scroll use **effective time** = audio time minus that offset.

### Clock sync lab (relay — Mode A, dev/legacy)

The **`relay/`** Cloudflare Worker is **optional** for **browser-to-browser P2P** (default Sync Lab P2P path uses **hyperswarm-web** only). Use the relay when you want the **queued pairing** / **room** behavior from Phase 4 or a **known** `wss://` without running a bootstrap server.

Press **T** on the title screen to open **Sync Lab**: it connects to the relay WebSocket (dev default `ws://127.0.0.1:8787` while `pnpm relay:dev` is running), sends ten **ping** messages with UTC `t1`, receives **pong** with server `t2`/`t3`, and shows per-sample **offset** / **RTT** and an EMA of offset. If the socket drops, the UI explains the close reason and you can press **SPACE** again to reconnect. For staging or production, set **`VITE_RELAY_WS`** (e.g. `wss://your-worker.workers.dev`) before `pnpm build`. See **`docs/deployment-vercel-cloudflare.md`** for Worker deploy.

### Clock sync lab (P2P)

Use **hyperswarm-web** in the browser for peer discovery + WebRTC — **P2P plan:** `docs/p2p-plan.md`; requirements: `docs/prd-p2p-sync.md`. **Sync Lab** can run in P2P mode:

1. Set **`VITE_P2P_BOOTSTRAP`** to the **base** `ws://` or `wss://` URL of your [hyperswarm-web](https://github.com/RangerMauve/hyperswarm-web) server (default CLI port **4977**). Do **not** include `/proxy` in the env value — the client appends `/proxy` and `/signal` itself.
2. Run a bootstrap server locally, e.g. `npx hyperswarm-web` or `pnpm dlx hyperswarm-web` (or `pnpm exec hyperswarm-web` if installed globally).
3. Open the app with **`?sync=p2p`** (or set **`VITE_SYNC_LAB_MODE=p2p`** before build). Optional: **`?topic=my-room`** so two tabs share the same topic string (SHA-256 topic key). In Sync Lab P2P: **C** copies a **join link**; **N** picks a **new random topic** and reloads.
4. Open **two** tabs with the same `topic`, press **SPACE** on one (initiator runs **10 NTP samples**; the other tab answers **pong**). See `docs/architecture-p2p-holepunch.md`. Field validation: **`docs/p2p-sync-lab-manual-qa.md`**.

The P2P module is **lazy-loaded** when you run the probe so the default relay build stays smaller until you use P2P.

**ICE (STUN / TURN shape):** WebRTC uses `src/p2p/iceConfig.ts` — built-in **public STUN** URLs; optional extra URLs / TURN objects merge for symmetric NAT (full TURN wiring is **P3**). Bootstrap is typically **one small VPS** with `hyperswarm-web` — see `docs/architecture-p2p-holepunch.md` and `docs/deployment-vercel-cloudflare.md`.

**NFR (P1 quick notes):** **N1** — compare median offset vs relay on a good network (same Sync Lab UI). **N2** — P2P code stays in the lazy chunk (`syncLabP2p-*.js`). **N3** — treat **`?topic=`** as **public** (anyone on the topic can join); do not put secrets in topic strings. **N4** — run bootstrap on a single low-cost host; document in architecture/deployment docs.

## Testing (see `plan.md`)

- **Convention:** colocated `*.test.ts` next to sources (or under `relay/` for Worker helpers).
- **Chart / judge:** `.dance` parsing, `buildNoteTimeline`, and judge windows are covered with **fixtures** and **ParseError** reports **1-based source line** on failure (plan Phase 1.1).
- **Relay:** `relay/src/protocol.ts` is unit-tested without deploying (plan Phase 0.6).
- **Cache:** `fetchChartTextCached` uses **fake-indexeddb** in Vitest for IndexedDB roundtrip (plan Phase 2.2).
- **E2E:** `e2e/smoke.spec.ts` loads `/?e2e=1` and drives play via `#e2e-status`; `e2e/syncLab.spec.ts` loads Sync Lab relay + P2P hooks. **CI** runs `pnpm build` → `playwright install chromium --with-deps` → `pnpm e2e`.

## Operator docs

- `docs/performance-budget.md` — manual performance checklist (Phase 5.2).
- `docs/operator-runbook.md` — deploy, relay, OAuth rotation (Phase 5.3).
- `docs/release-checklist.md` — pre-release and acceptance (Phase 5.4).

## Layout

- Root: `package.json`, Vite, ESLint, Prettier, Vitest
- `src/` — Phaser app
- `src/chart/dance/` — `.dance` parser + `buildNoteTimeline` (pydance-compatible math; tested)
- `src/cache/` — `fetchChartTextCached` / `decodeAudioFromUrlCached` (IndexedDB via `idb-keyval`)
- `src/audio/` — `AudioClock`, `AudioScheduler` (Web Audio–relative timing)
- `src/scenes/SongSelectScene.ts` — pick chart + difficulty index; passes `PlaySceneData` to `PlayScene`
- `src/scenes/ResultsScene.ts` — Dance Points summary (pydance-style) after a chart completes; **R** → song select
- `src/scoring/dancePoints.ts` — `grades.py` Dance Points weights + letter grade
- `src/load/httpSongLoader.ts` — `{base}/{songId}/{songId}.dance` fetch helper (Phase 2.1)
- `src/songSelect/songSelectRows.ts` — built-in demo list (testable)
- `relay/` — Cloudflare Worker (Wrangler)

StepMania `.sm` / `.ssc` support is **post-MVP** (see `plan.md`).

## Phase 0 — Hosting & demo assets (plan)

- **Deploy (Vercel + Cloudflare Worker + DNS):** step-by-step guide for beginners: [`docs/deployment-vercel-cloudflare.md`](docs/deployment-vercel-cloudflare.md). **Lowest $ / lowest ops:** [`docs/deployment-shoestring.md`](docs/deployment-shoestring.md).
- **Static app:** target production URL `https://dance.malldao.xyz` (or Vercel / Cloudflare Pages). CI builds a static `dist/`; deploy that folder.
- **Relay Worker:** deploy `relay/` with Wrangler; set `VITE_RELAY_WS` / `VITE_PUBLIC_RELAY_WS` to the deployed `wss://` URL. **Cold starts** clear in-memory queue state; acceptable for MVP sync proof (see `plan.md` Appendix B).
- **Demo charts on disk (maintainer):** reference pydance tree `beatgen/pydance/songs/` (SynRG, 6jan, Forkbomb). This repo ships a **minimal** subset under `public/songs/` for HTTP loading; do not add large binaries without checking license.
- **Env template:** `.env.example` lists `VITE_RELAY_WS` and optional `VITE_ATPROTO_PDS_HOST`.
