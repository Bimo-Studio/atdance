# Release checklist (MVP)

Plan Phase 5.4 — before tagging and announcing.

## Repository and CI

- [ ] `main` (or `master`) is **green**: format check, lint, typecheck, unit coverage, build, **Playwright E2E** (see CI workflow).
- [ ] **Branch protection** on the default branch: required status checks, no direct pushes if your team uses PRs.
- [ ] **Conventional Commits** respected so release-please can generate `CHANGELOG.md` (see root README).

## Version and changelog

- [ ] **Release PR** from release-please merged (or version bumped manually with an updated `CHANGELOG.md` entry).
- [ ] **Git tag** matches the shipped version after release (e.g. `v0.1.0`).

## Product acceptance (cross-check with `plan.md` MVP section)

- [ ] Three demo songs playable over **HTTP** in production.
- [ ] WebTorrent path either works or **falls back** to HTTP without a dead end.
- [ ] OAuth + PDS write works against your **self-hosted** PDS when configured.
- [ ] Relay demonstrates stable clock sync under good network (manual **120s** two-browser procedure in README or `plan.md` Phase 4 gate).

## Deploy artifacts

- [ ] Static **Pages** (or chosen host) deploy from latest `dist/`.
- [ ] **Worker** relay deployed; `VITE_RELAY_WS` in the client build points at the live `wss://` URL.
