# Module: workflow

Tracker-agnostic phase-by-phase issue lifecycle. Always loaded. The chosen `ticketing/<provider>.md` plugs into the placeholders below to make the rendered `WORKFLOW.md` tracker-specific.

Distilled from `speaking-club/sc-repos/WORKFLOW.md` and the three commands (`run-issue`, `run-e2e`, `ship-issue`).

## Inputs

- `tracker` — from ticketing Q&A
- `e2e_gate` — `y` | `n`
- `staging_policy` — `single-tenant` | `per-branch-preview`
- `iter_budget_run_issue` — default `5`
- `iter_budget_run_e2e` — default `2`
- All opted-in repos

## Commands stamped

| Command | Stamped if |
|---|---|
| `run-issue.md` | always |
| `run-e2e.md` | e2e_gate = y |
| `ship-issue.md` | e2e_gate = y |
| `hotfix.md` | hotfix_enabled = y (per `git-flow.md`) |

## Phase map (rendered into `<root>/WORKFLOW.md`)

### `/run-issue <id|prompt>` — Phases 0–8 → ends at **draft PR**

| Phase | Action | Notes |
|---|---|---|
| 0 | **Intake & triage** | Detect mode (existing issue / auto-create / Mode B untracked). Classify scope across opted-in repos. Tracker: move ticket → **In Progress** (Mode A). |
| 1a | **Plan** — file-level | Per-repo file list and rationale |
| 1b | **Size check** | Triggers: >400 LOC, >5 AC, contract+client coupling, all opted-in repos touched, high-risk + ≥250 LOC. Tripped → propose decomposition → **always pause for human ACK** → file children → run only the first child |
| 1c | **High-risk eval** | Triggers: auth, schema, breaking event, nginx, ≥3 repos. Tripped → pause for human ACK |
| 2 | **Branch** | Per `git-flow.md`. Pre-flight: clean tree, on `dev`, `git pull origin dev`. Create `<id>_<slug>` in every touched repo. |
| 3 | **Implement** | `backend-specialist` first (contracts), then `mobile-specialist` / `web-specialist` / `web-admin-specialist` in parallel via `Agent` tool. `deployment-specialist` last if infra changes. |
| 4 | **Tests** | `backend-specialist`: unit + integration. `test-specialist`: E2E specs + page objects (if `e2e_gate = y`). |
| 5 | **Local gate** | lint → typecheck → unit → integration. Failure → **Failure Triage** (budget: `{{iter_budget_run_issue}}`). |
| 6 | **Staging deploy** | `git push origin <branch>`. Trigger CI (`gh workflow run build.yml --ref <branch>` then `deploy.yml`). Poll `{{STAGING_DOMAIN}}/health` with backoff (max 10 min). `single-tenant`: never run two `/run-issue` concurrently. `per-branch-preview`: deploys a unique preview per branch — concurrency safe. |
| 7 | **E2E** | NOT in `/run-issue` — only `/run-e2e` runs it. |
| 8 | **Draft PR** | One **draft** PR per touched repo, cross-linked, **base `dev`**. Mode A: PR body includes `Closes #<id>`. Mode B: embed prompt under "Context". Test plan checklist marks E2E as *pending — run `/run-e2e <id>`*. Tracker: issue **stays** at In Progress. STOP. Final hint: `Next: /run-e2e <id>`. |

### `/run-e2e <id|PR#|branch>` (only if `e2e_gate = y`)

| Phase | Action |
|---|---|
| Deploy-check | Verify each touched repo's staging state matches the branch HEAD (or `dev` HEAD if merged). Mismatch → ask user per-repo: deploy / skip / abort. |
| APK rebuild | Only if mobile repo touched and APK stale. Uses `envied` `.env` flow (no flavors). |
| Appium E2E | Run full suite against staging. Failure → **E2E Triage** (budget: `{{iter_budget_run_e2e}}`). Findings post as PR comments; PRs stay draft until gate passes. |
| Finalize | Mark PR(s) ready-for-review. Tracker: move ticket → **In Review**. STOP — workflow does not merge. |

### `/ship-issue <id|prompt>` (only if `e2e_gate = y`)

Thin chain: invoke `/run-issue $ARGS`, capture issue ID + draft PR URLs, then invoke `/run-e2e <id>`. STOP at first failure; never auto-advance.

## Failure triage subroutine

Entered from Phase 5 (local gate, budget `{{iter_budget_run_issue}}`) or Phase 11 (E2E, budget `{{iter_budget_run_e2e}}`).

1. **Classify**: in-scope (caused by our changes) vs out-of-scope.
2. **In-scope** → fix → re-run failed gate. Decrement budget on each iteration.
3. **Out-of-scope** → autonomously file a new tracker ticket (dedupe-checked); continue with current task.
4. **Blocker-severity** (security / data / availability) → pause the current PR for explicit human decision.
5. **Budget exhausted** → escalate to human, STOP.

## Tracker integration placeholders

The rendered `WORKFLOW.md` substitutes:

- `{{TRACKER_FETCH_ISSUE}}` — how to fetch an issue (e.g. `gh issue view`, `mcp__claude_ai_Linear__get_issue`)
- `{{TRACKER_CREATE_ISSUE}}` — how to create
- `{{TRACKER_MOVE_STATUS}}` — how to set Backlog/Todo/In Progress/In Review/Done
- `{{TRACKER_ADD_COMMENT}}` — how to post PR-link comments
- `{{TRACKER_LINK_SUBISSUE}}` — how to link a child issue to a parent (decomposition)

Each `ticketing/<provider>.md` provides the substitution table.

## Locked decisions (carried into rendered WORKFLOW.md)

| # | Decision | Value |
|---|---|---|
| 1 | Issue source | per `tracker` Q |
| 2 | Project layout | Single tracker board / project across all opted-in repos |
| 3 | Branch naming | `<id>_<slug>` (or `<slug>` Mode B), no `type/` prefix |
| 4 | Staging deploy | `gh workflow run` deploys feature branch; CI polls `/health` |
| 5 | Plan approval | Pause only on high-risk plans (Phase 1c) |
| 6 | Out-of-scope filing | Autonomous, with notification (dedupe-checked) |
| 7 | Blocker handling | Pause current PR for human decision |
| 8 | Iteration budget | `{{iter_budget_run_issue}}` for `/run-issue`, `{{iter_budget_run_e2e}}` for `/run-e2e` |
| 9 | Merge policy | Manual — workflow stops at PR creation. PR base is always `dev`. |
| 10 | Implement / E2E split | `/run-issue` stops at draft PR; `/run-e2e` finalizes |

## What this module renders

- `<root>/WORKFLOW.md` — full phase-by-phase doc with tracker substitutions applied
- `<root>/.claude/commands/run-issue.md`
- `<root>/.claude/commands/run-e2e.md` (if applicable)
- `<root>/.claude/commands/ship-issue.md` (if applicable)
- Section in `<root>/CLAUDE.md` summarizing the three-command workflow + links

## Hard rules

- Never auto-advance from `/run-issue` to `/run-e2e` without explicit invocation
- Never run two `/run-issue` concurrently when `staging_policy = single-tenant`
- Never skip Phase 1c human ACK on high-risk plans
- Never merge — always stop at PR ready-for-review
- Never dismiss a blocker-severity finding without explicit user approval
