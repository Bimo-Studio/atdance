# Performance budget (MVP)

Plan Phase 5.2 — **manual** checks before tagging a release. Lighthouse CI is optional; this checklist is the baseline.

## Frame time and audio

- [ ] **Play scene** holds **≥ 55 FPS** on a mid-range laptop in Chrome during a full chart (open DevTools Performance if needed).
- [ ] **No sustained audio underruns** during play: no obvious stuttering or dropouts on wired headphones for a 2–3 minute song.
- [ ] **Cold load** of song select from title is interactive within a few seconds on a typical connection (demo charts cached after first load).

## Bundle and network

- [ ] Production `pnpm build` completes without unexpected Rollup warnings beyond the known large-chunk notice; track chunk size if you add new heavy deps.
- [ ] **HTTP path** for demo songs works without blocking the main thread for multiple seconds (chart parse stays responsive).

## Optional: Lighthouse (local)

Run against `pnpm preview` or staging:

```bash
pnpm build && pnpm preview
# In another terminal, run Lighthouse CLI or Chrome DevTools → Lighthouse (Performance + Accessibility smoke).
```

Treat scores as **signals**, not gates, unless you adopt Lighthouse CI later.
