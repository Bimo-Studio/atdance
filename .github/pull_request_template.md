## Summary

<!-- What changed and why (one short paragraph). -->

## Contract & docs

- [ ] **Spec:** If behavior, env vars, or protocols changed, the PR updates the relevant doc (`docs/prd-*.md`, `docs/architecture-*.md`, `plan.md`, or `README` / `.env.example`).
- [ ] **P2P PRD tasks:** If this PR completes a P2P checklist item, `docs/tasks-p2p-prd.md` / `docs/tasks-p2p-prd-test-matrix.md` are updated accordingly.

## Tests (enforce the contract)

- [ ] **Every behavior change** has a test that would fail without it (`AGENTS.md`).
- [ ] **Local or CI:** `pnpm lint && pnpm typecheck && pnpm test` — or rely on **CI green** on this PR.

## Merge readiness

**If CI is green and the boxes above are checked, this PR is merge-eligible** per `docs/merge-gates.md` — no separate “looks good” required unless you want a human review for risk.
