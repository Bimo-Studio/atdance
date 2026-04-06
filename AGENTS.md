# Agent & contributor expectations (ATDance)

This file is for **humans and AI coding agents** (Cursor, etc.). It does **not** replace CI or review — it aligns intent so work stays **test-backed**, **scoped**, and **traceable**.

## What we cannot “guarantee”

Tools and prompts **reduce** drift; they **do not** mathematically guarantee correct code. **Enforcement** comes from: **CI** (`.github/workflows/ci.yml`), **review**, and **you** rejecting incomplete work. Agents should still follow everything below.

**Merge without chat approval:** when **CI is green** and **`docs/merge-gates.md`** checklist + PR template are satisfied, treat the change as **merge-eligible** — no need for “looks good” in conversation.

---

## Source of truth (anti-hallucination)

1. **`plan.md`** — phased scope, DoD, what is in/out of MVP.
2. **`docs/test-plans.md`** — layered **unit / functional / integration / BDD** expectations per **system**; extend it when new subsystems ship.
3. **`docs/prd-*.md` / `docs/architecture-*.md`** — product and architecture decisions; **do not invent** APIs or infra not described without updating the doc in the same change. For **P2P sync (PRD)**, also follow **`docs/tasks-p2p-prd.md`** — **ordered** checkboxes; do **not** skip phases. Required **proof per task**: **`docs/tasks-p2p-prd-test-matrix.md`**.
4. **Existing code** — **read** relevant files before editing; **cite paths** in PRs and agent summaries.
5. **`package.json` scripts** — run **`pnpm lint`**, **`pnpm typecheck`**, **`pnpm test`** (or **`pnpm test:coverage`** when touching covered code) from repo root unless the task is docs-only.
6. **`docs/merge-gates.md`** — objective **merge eligibility** (CI + spec + PR checklist); use instead of informal approval in chat.

---

## TDD (test-driven development)

- For **new behavior** or **bug fixes**: prefer a **failing test first** (Vitest: `src/**/*.test.ts`, `relay/**/*.test.ts`), then minimal implementation to pass.
- **Pure logic** (parsing, NTP math, message schemas): **unit tests** required.
- **Thin UI / Phaser**: test **pure helpers**; E2E/smoke per `plan.md` Phase 5 — not every line in scenes.
- **Do not** merge behavior changes **without** a test that would fail if the behavior regressed (matches `plan.md` golden rule).

## BDD (behavior-driven style)

- Write **`describe` / `it`** names as **observable behavior** (e.g. “returns offset when two samples agree”), not internal names only.
- Playwright specs in `e2e/` describe **user-visible** flows where applicable.

---

## Per-task / per-phase workflow

1. **Before** substantive edits: `pnpm lint && pnpm typecheck && pnpm test` — **green** (or fix unrelated failures before mixing scope).
2. **After** edits: same commands; **`pnpm build`** if build inputs changed.
3. **End of a phase** (see `docs/prd-p2p-sync.md` and `plan.md`): acceptance criteria **met**, tests **green**, docs **updated** if behavior or env vars changed.
4. **Do not stop** on “partial” without explicit **TODO** in code + issue/PR note — prefer **small PRs** that each **complete** one vertical slice with tests.

---

## Drift prevention

- **Lock files**: after dependency changes, commit **`pnpm-lock.yaml`**.
- **Env / Vite**: document new `VITE_*` in **README** and **`.env.example`** when added.
- **Contradiction**: if `plan.md` and a PRD disagree, **stop** and reconcile docs **before** coding the ambiguous part.

---

## Cursor-specific

- Project rules live in **`.cursor/rules/`** (`.mdc` files). They **amplify** this file; they do not replace CI.

---

_Last updated: 2026-04-06_
