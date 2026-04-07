# Process: feature / initiative delivery (research → PRD → todos → implementation)

**Authority:** When the user says **“use the process”**, **“follow the delivery process”**, or **“use the process document”**, they mean **this file**: `docs/process-feature-delivery.md`. Agents and humans **must** follow it for work that introduces **new product behavior**, **new subsystems**, **multi-file / multi-session scope**, or **anything that would normally warrant a PRD**. Small, isolated fixes (one function, typo, single test) may skip phases 1–5 **only** if they do not change contracts, user-visible behavior, or architecture; when in doubt, **use the full process**.

**Goals**

1. **Nothing important lives only in chat** — research, plans, PRDs, and todos are **files in the repo**.
2. **No implementation before written todos** — avoids half-baked delivery and “forgot what we agreed” drift across LLM sessions.
3. **TDD + BDD + coverage** are **non-negotiable** for deliverables under this process (see §7).
4. **Unknown-unknowns** are explicitly surfaced to the stakeholder **before** coding.

---

## 0. Applicability checklist

Use the **full** process when **any** of these is true:

- [ ] New user-facing flows, settings, or game modes.
- [ ] New network protocols, sync semantics, or persistence formats.
- [ ] New dependencies with integration surface (OAuth, WebRTC, Workers, etc.).
- [ ] Work expected to take **more than one** implementation session or PR.
- [ ] The user invoked this process by name.

You may use a **lightweight** path (research + short plan only, no PRD) only if the user explicitly agrees in writing (in the plan file or issue).

---

## 1. Research phase (mandatory)

### 1.1 What to do

Before proposing solutions, **actively research**:

- **In-repo:** related PRDs (`docs/prd-*.md`), architecture docs, existing modules, tests, relay/worker code, env patterns.
- **Upstream / ecosystem:** official docs for libraries (Vite, Phaser, ATProto, Cloudflare Workers, etc.), RFCs, security notes, known limitations.
- **Comparable solutions:** prior art (e.g. similar games, sync strategies, OAuth patterns); cite links and tradeoffs.

Do **not** rely on memory from earlier chat turns. **Re-read** files in the workspace when relevant.

### 1.2 Artifact: research file

- **Create a new file** in **`docs/research/`** (create the directory if missing).
- **Naming:** `docs/research/<short-task-slug>.md`  
  Examples: `docs/research/pvp-matchmaking.md`, `docs/research/oauth-streamplace-alignment.md`.
- If multiple related spikes exist, use suffixes: `pvp-matchmaking-02-webrtc.md`.

### 1.3 Minimum contents of the research file (be exhaustive)

1. **Problem restatement** — one paragraph in your own words.
2. **Constraints** — from user, repo, platform (browser, Worker limits, etc.).
3. **Options considered** — table: option | pros | cons | fit for ATDance.
4. **References** — bullet list with **full URLs** and short notes (what you took from each).
5. **In-repo pointers** — file paths and one-line roles.
6. **Risks & open technical questions** — security, privacy, performance, testability.
7. **Recommendation** — which option(s) to pursue in planning, with rationale.

**Length:** Prefer **over-complete** to under-complete. This file is cheap; rediscovering context is expensive.

---

## 2. Planning phase (mandatory)

### 2.1 Consume research

Read your own **`docs/research/<slug>.md`** end-to-end. Update it if you discover gaps while planning (same PR or follow-up commit; note **“Update YYYY-MM-DD”** at the bottom).

### 2.2 Artifact: plan file

- **Create:** `docs/plans/<short-task-slug>-plan.md`  
  Match the research slug where possible: research `pvp-matchmaking.md` → plan `pvp-matchmaking-plan.md`.

### 2.3 Minimum contents of the plan file (be exceedingly detailed)

1. **Objective** — measurable outcome.
2. **Non-goals** — explicit exclusions.
3. **Dependencies** — other tasks, env vars, infra, feature flags.
4. **Architecture / approach** — components, data flow, failure modes. Diagrams (mermaid or ASCII) encouraged.
5. **File-level touch list** — expected new/changed paths (best guess; OK to revise).
6. **Testing strategy** — unit (Vitest), integration, Playwright (BDD), coverage expectations, what is hard to test and how you’ll mitigate.
7. **Rollout** — flags, migrations, backward compatibility.
8. **Observability & ops** — logs, metrics, dashboards, runbooks if applicable.
9. **Risks & mitigations** — ranked.
10. **Estimated phases** — rough ordering (not the final todo list yet).

### 2.4 Clarifying questions (mandatory section)

At the **bottom** of the plan file, add:

```markdown
## Clarifying questions (for stakeholder review)

1. ...
2. ...

## Unknown-unknowns — did you consider?

- **Security / abuse:** ...
- **Privacy / compliance:** ...
- **Operational cost:** ...
- **Accessibility / UX edge cases:** ...
- **Backward compatibility / migrations:** ...
- **Failure modes / degraded behavior:** ...
```

**Stop** after writing the plan and questions. **Ask the stakeholder explicitly:** _“Please review the plan and answer the clarifying questions. I will revise the plan based on your feedback and record revisions in this file.”_

### 2.5 Revision loop

When feedback arrives:

- Append a **`## Revision history`** section with date, summary of change, and reason.
- Update the body of the plan so it stays **one coherent current story** (or clearly mark superseded sections).

Repeat until the stakeholder **approves** the plan in writing (comment in PR, issue, or explicit chat message). Paste or summarize approval into the plan file under **`## Approval`** with **date** and **approver**.

**Do not write the PRD until approval** (next section).

---

## 3. PRD phase (after plan approval only)

### 3.1 Artifact

- **Create or replace:** `docs/prd-<feature-slug>.md`  
  Align slug with research/plan where possible.

### 3.2 PRD quality bar

The PRD must be:

- **Technical** — protocols, types, env vars, error codes, idempotency, versioning.
- **Specific** — no hand-wavy “handle errors”; name behaviors.
- **Thorough** — goals, non-goals, user stories, edge cases, out-of-scope, dependencies, test strategy pointer, observability, rollout.

If during PRD writing you discover gaps, **update the PRD** and, if needed, **loop back** to a short plan addendum (documented in `docs/plans/…` revision history).

### 3.3 Cross-links

- Link **from** PRD **to** research: `See docs/research/<slug>.md`.
- Link **from** PRD **to** approved plan: `See docs/plans/<slug>-plan.md`.

---

## 4. Todo decomposition (mandatory; before any implementation)

### 4.1 Artifact

- **Create or replace:** `docs/tasks-<feature-slug>.md`  
  (Example: `docs/tasks-pvp-matchmaking.md`.)

This file is the **execution runway** for LLM sessions that reset. **Checkbox granularity:** each item must fit **one context window** (one focused implementation pass: design + code + tests for that slice, or a test-only slice). If an item is too big, **split it** (e.g. `P3.3a`, `P3.3b`) until each row is small enough.

### 4.2 Mandatory sections in every tasks file

1. **Purpose & update rules** — future agents must update this file when tasks complete.
2. **Handoff block** — last updated, next task, blockers, notes (see template below).
3. **Global gates** — every milestone:
   - `pnpm lint`
   - `pnpm test` (100% pass)
   - `pnpm test:coverage` (must satisfy thresholds in `vitest.config.ts`, typically **≥ 50%** lines/statements on included globs)
4. **Phased checkboxes** — ordered; dependencies first.
5. **TDD / BDD rows** — explicit; not optional fluff:
   - **TDD:** Vitest for pure logic; failing test before or with minimal implementation.
   - **BDD:** Playwright (or project-agreed E2E) for user-visible flows where applicable.
6. **Appendix** — “landed vs open” snapshot optional but recommended.

### 4.3 Hard rules for todos

| Rule                                    | Detail                                                                                                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No implementation until todos exist** | Do not open implementation PRs until `docs/tasks-<slug>.md` is written end-to-end for the approved PRD scope.                                                         |
| **No partial completion**               | “Stub” or “later” in production paths is **not** done unless PRD explicitly calls a **phased** release **and** the same is reflected in todos with a **later** phase. |
| **Checkbox = tests green**              | Do not check a box until **`pnpm test`** passes for that slice and **`pnpm lint`** is clean.                                                                          |
| **Coverage**                            | **`pnpm test:coverage`** must meet repo thresholds before the **milestone** or **project** is marked complete.                                                        |
| **Multiple passes**                     | It is OK to add rows in **second/third passes** when detail emerges; update the PRD when new scope appears.                                                           |

### 4.4 Handoff template (copy into every `docs/tasks-*.md`)

```markdown
## Handoff block (update when you stop)

| Field                      | Value             |
| -------------------------- | ----------------- |
| **Last updated**           | YYYY-MM-DD        |
| **Branch / PR**            |                   |
| **Next row to pick**       | (first unchecked) |
| **Blockers**               |                   |
| **Notes for next session** |                   |
```

---

## 5. Implementation phase

Only after §4 is satisfied:

1. Pick the **first unchecked** task in `docs/tasks-<slug>.md`.
2. Implement with **TDD** for pure code; **BDD** when the task row says Playwright.
3. Run **global gates** at appropriate intervals (at least before PR merge).
4. **Check the box** only when tests for that slice pass.
5. Update **Handoff** in the tasks file when stopping work.

---

## 6. Definition of done (project / initiative)

The initiative is **complete** only when:

- [ ] `docs/prd-<slug>.md` reflects final shipped behavior (or points to ADRs for intentional diffs).
- [ ] `docs/tasks-<slug>.md` has **all** checkboxes **checked**.
- [ ] `pnpm lint && pnpm test && pnpm test:coverage` pass on the merge target.
- [ ] `AGENTS.md` / `docs/test-plans.md` updated if new systems need ongoing proof.

**Partial implementation is forbidden** for initiatives run under this process unless an explicit **phased release** is documented in the PRD **and** mirrored in tasks with clear phase boundaries.

---

## 7. Testing requirements (embedded in every todo file)

Every `docs/tasks-<slug>.md` **must** include explicit rows or gate sections for:

1. **TDD** — Vitest; new pure modules with tests first where feasible.
2. **BDD** — Playwright (or repo-standard E2E) for user journeys where applicable.
3. **`pnpm test`** — 100% pass before merge.
4. **`pnpm test:coverage`** — meets **`vitest.config.ts`** thresholds (this repo commonly enforces **≥ 50%** lines and statements on included globs).

Phaser scenes may stay thin; **extract logic** to testable modules so coverage stays meaningful (`AGENTS.md` aligns with this).

---

## 8. File naming summary

| Phase    | Path pattern                |
| -------- | --------------------------- |
| Research | `docs/research/<slug>.md`   |
| Plan     | `docs/plans/<slug>-plan.md` |
| PRD      | `docs/prd-<slug>.md`        |
| Todos    | `docs/tasks-<slug>.md`      |

Use a **consistent `<slug>`** across all four when they describe the same initiative.

---

## 9. Relationship to other repo docs

- **`AGENTS.md`** — contributor expectations; points **here** for full delivery process.
- **`plan.md`** — product roadmap; initiatives must align or update `plan.md` when scope ships.
- **`docs/merge-gates.md`** — merge eligibility; process does not replace CI.
- **`docs/test-plans.md`** — extend when new systems ship.

---

## 10. Changelog of this process

| Date       | Change                                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-06 | Initial version: research → plan → review → PRD → tasks → implementation; TDD/BDD/coverage mandatory; no implementation before todos; handoff blocks. |
