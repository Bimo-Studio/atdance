# Process: feature / initiative delivery (research → PRD → todos → implementation)

## Authority

When the user says “use the process”, “follow the delivery process”, or “use the process document”, they mean this file: `docs/process-feature-delivery.md`.

This process is normative and binding. Any deviation invalidates completion claims.

---

## Core invariants (non-negotiable)

1. Nothing important lives only in chat — all artifacts must exist in the repo.
2. No implementation before written todos.
3. TDD + BDD + coverage are mandatory.
4. Zero-stub invariant must hold at all completion boundaries.
5. All completion claims require verifiable evidence.

---

## Stub definition (normative)

A stub is any code path that:

- Returns hardcoded or placeholder data not derived from real inputs
- Contains TODO, FIXME, or TBD markers
- Throws “not implemented” or equivalent
- Skips required side effects defined in the PRD
- Mocks or bypasses integrations in non-test code
- Implements only interfaces or types without real behavior

### Allowed use

- Temporary decomposition within a single task only

### Forbidden

- Any completed task
- Any merged code
- Any Definition of Done claim

---

## 0. Applicability checklist

Use full process if any:

- New user-facing behavior
- New system or subsystem
- Multi-session work
- New dependencies
- User invokes process

---

## 1. Research phase (mandatory)

Artifact: `docs/research/<slug>.md`

Required contents:

- Problem restatement
- Constraints
- Options with tradeoffs
- References (URLs)
- In-repo pointers
- Risks
- Recommendation

---

## 2. Planning phase (mandatory)

Artifact: `docs/plans/<slug>-plan.md`

Required contents:

- Objective
- Non-goals
- Dependencies
- Architecture
- File-level changes
- Testing strategy
- Rollout
- Observability
- Risks

Required sections:

- Clarifying questions
- Unknown-unknowns

Stop and request stakeholder approval.

---

## 3. PRD phase

Artifact: `docs/prd-<slug>.md`

Requirements:

- Fully technical
- Explicit behaviors
- Edge cases defined

### Integration classification (required)

| Integration | Type                   | Notes       |
| ----------- | ---------------------- | ----------- |
| Example     | REAL / MOCKED / HYBRID | Description |

Rules:

- REAL → must execute in tests
- MOCKED → allowed
- HYBRID → must define boundary

---

## 4. Todo decomposition (mandatory)

Artifact: `docs/tasks-<slug>.md`

Hard rules:

- No implementation before todos
- No stubbed completion
- Checkbox equals tests plus evidence
- Tasks must fit one context window

### Stub fallback rule

If a task cannot be completed fully:

1. Stop
2. Do not stub
3. Split task into smaller tasks
4. Resume

---

## Required sections in tasks file

### Handoff block

| Field                  | Value      |
| ---------------------- | ---------- |
| Last updated           | YYYY-MM-DD |
| Branch / PR            |            |
| Next row to pick       |            |
| Blockers               |            |
| Notes for next session |            |

---

### Global gates

- pnpm lint
- pnpm test
- pnpm test:coverage
- Stub scan must return zero results

---

### Stub scan (mandatory)

Example command:

```
grep -R "TODO\|FIXME\|TBD\|not implemented" src/
```

In this repo, prefer **`pnpm stub-scan`** (also runs as part of **`pnpm lint`**) — scans `src/` and `relay/src/` and excludes `*.test.ts` / `*.d.ts`. For PvP glue in **`src/scenes`**, run **`pnpm stub-scan:audit`** before claiming **real-sync** milestones (`src/ci/stubScan.ts` — scene-level stub markers). **Open PvP product gaps** (chart negotiation, persistent relay session, remote HUD) are **indexed** in **`docs/tasks-pvp-real-sync.md`** under **Remaining product gaps**, with detailed rows in Phase **N** / **S**.

Any match outside test directories is a failure.

---

### PRD to Implementation mapping (mandatory)

| PRD Requirement | Code Path | Test File | Status |
| --------------- | --------- | --------- | ------ |

Rules:

- Every requirement must map
- Missing mapping means not implemented

---

## 5. Implementation phase

Workflow:

1. Pick first unchecked task
2. Implement with TDD or BDD
3. Run gates
4. Provide evidence
5. Check box only if valid

---

## Evidence requirement (non-optional)

| Claim                   | Required evidence         |
| ----------------------- | ------------------------- |
| No stubs                | Stub scan output          |
| Tests pass              | pnpm test output          |
| Coverage met            | pnpm test:coverage output |
| Requirement implemented | PRD mapping               |
| Integration works       | Test or log proof         |

No evidence means failure.

---

## Zero-stub invariant (hard gate)

Before:

- Checking any box
- Moving to next task
- Completing milestone
- Completing project

Must verify:

- No stubs exist
- No TODO or FIXME outside tests
- All PRD paths implemented

If violated:

- Task is incomplete
- Must fix or decompose

---

## Integration enforcement

For each REAL integration:

- Must run in tests
- No mocking allowed
- Must assert execution

---

## Failure-mode requirement

Each integration must test:

- Success path
- Failure path

---

## Data flow validation

Must test:

- Input → transformation → output
- Real state changes

No-op logic is failure.

---

## Test quality rules

Tests must:

- Assert specific values
- Fail on incorrect logic
- Include negative cases

Forbidden:

- Assertions that only check existence
- Always-true tests

---

## Skipped work rule

Forbidden:

- test.skip
- describe.skip
- it.only

---

## 6. Coverage rules (revised)

1. Global thresholds must pass
2. Changed files must meet at least 80 percent coverage
3. Critical modules must meet at least 90 percent coverage

---

## Coverage integrity

Coverage is invalid if:

- Only happy paths are tested
- Branches are untested
- Stub logic passes tests

---

## 7. Command output requirement

Must include raw output of:

- pnpm lint
- pnpm test
- pnpm test:coverage
- stub scan

Summaries are not acceptable.

---

## Reproducibility rule

Another agent must be able to run the same commands and observe the same results.

---

## 8. Pre-release certification

Before final completion:

- No stubs exist
- All PRD requirements mapped
- No skipped tests
- Integrations verified
- Failure modes tested

---

## 9. Final task: RP.1

Must be the last checkbox.

Cannot be completed unless:

- All tasks complete
- All evidence present
- Zero-stub invariant satisfied

---

## 10. Definition of Done

Complete only if:

- All tasks checked
- RP.1 complete
- All gates pass
- Zero-stub invariant holds globally
- Evidence provided

If any stub exists:

- Initiative is not complete

---

## 11. Enforcement model

Assume:

- Implementer will attempt shortcuts
- Assertions are untrusted
- Evidence is required

---

## 12. File naming

| Phase    | Path                      |
| -------- | ------------------------- |
| Research | docs/research/<slug>.md   |
| Plan     | docs/plans/<slug>-plan.md |
| PRD      | docs/prd-<slug>.md        |
| Tasks    | docs/tasks-<slug>.md      |

---

## 13. Final principle

If something is:

- not tested
- not evidenced
- not mapped
- or contains a stub

Then it is not done.
