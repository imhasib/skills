---
description: Run Phases 0–8 of WORKFLOW.md (implement → dev deploy → draft PR). Stops before E2E.
argument-hint: <issue-id-or-url-or-prompt>
---

Run the **fast-path implementation workflow** as defined in [`WORKFLOW.md`](../../WORKFLOW.md). That document is the source of truth. Read it before starting if anything below is ambiguous.

This command **stops at draft PRs**. It does not run the E2E loop. To finalize PRs and move the issue to *In Review*, run `/run-e2e <id-or-branch>` afterward. To chain both, use `/ship-issue`.

User input: `$ARGUMENTS`

---

## Step 1 — Detect entry mode

Inspect `$ARGUMENTS`:

- **Empty** → ask the user for an issue ID/URL or a free-text task description, then re-enter Step 1.
- **Tracker issue reference** (matches `{{TRACKER_ISSUE_PATTERN}}`) → **Mode A (existing issue)**. Fetch it via `{{TRACKER_FETCH_CMD}}`.
- **Free-text prompt** → ask: *"Auto-create a tracker issue for this task? [Y/n]"*
  - **Y** → **Mode A (auto-create)**: draft title + body + acceptance criteria, present for human ACK, on approval run `{{TRACKER_CREATE_CMD}}`. Use the new issue ID from there on.
  - **n** → **Mode B (untracked)**: keep the prompt as the spec; no tracker issue, no status moves.

---

## Step 1.5 — Detect parent vs child

If Mode A, check whether the issue has children via `{{TRACKER_SUBISSUE_QUERY}}`:

- Has open children → this is a **parent**. List the open children and ask the user which to run next. STOP.
- Has a parent → this is a **child**. Skip Phase 1b's size check. Proceed to 1c.
- Neither → standard atomic issue; full Phase 1 applies.

---

## Step 2 — Run the phases

Track progress with `TaskCreate` / `TaskUpdate`. Follow `WORKFLOW.md` exactly. Delegation rules in `CLAUDE.md`. Summary:

| Phase | Action | Notes |
|---|---|---|
| 0 | Intake & triage | Mode A: move issue → **In Progress** via `{{TRACKER_MOVE_IN_PROGRESS}}`. Classify scope across in-scope repos. |
| 1a | Plan | Per-repo file-level change plan. |
| 1b | **Size check** | Triggers: >400 LOC, >5 AC, contract+client touch, all code repos touched, high-risk + ≥250 LOC. If tripped → propose split → **⏸ always ACK** → create child issues via `{{TRACKER_CREATE_SUBISSUE}}` → start the FIRST child only. |
| 1c | High-risk eval | Security / data / auth / payments → ⏸ human ACK before implement. |
| 2 | Branch | Pre-flight (clean tree, on `dev`, `git pull origin dev`). Create branch in every touched repo, branched from `dev`: `<issue-id>_<snake_slug>` (Mode A) or `<snake_slug>` (Mode B). Slug: lowercase ASCII, `_`-joined, ≤5 words. |
| 3 | Implement | `backend-specialist` first (contracts), then `mobile-specialist` / `web-specialist` / `web-admin-specialist` in parallel via the `Agent` tool. |
| 4 | Tests | `backend-specialist`: unit + integration. {{#E2E_GATE}}`test-specialist`: Appium specs + page objects for new UI.{{/E2E_GATE}} |
| 5 | Local gate | Lint → typecheck → unit → integration. Any failure → **Failure Triage** (budget: `{{ITER_BUDGET_RUN_ISSUE}}`). |
| 6 | Dev deploy | `git push origin <branch>`. Trigger build + deploy workflows. Poll `https://{{DEV_DOMAIN}}/health` with backoff (max 10 min). Dev is `{{DEV_POLICY}}` — never overlap with another in-flight `/run-issue` or `/run-e2e`. |
| 8 | **Draft PR** | One **draft** PR per touched repo, cross-linked, base `dev`. Mode A: body includes `Closes <issue-ref>` (`{{TRACKER_CLOSES_KEYWORD}}`). Mode B: embed prompt under "Context". {{#E2E_GATE}}Test plan checklist marks E2E as *pending — run `/run-e2e`*.{{/E2E_GATE}} **Mode A: issue STAYS at In Progress** (move to In Review happens in `/run-e2e` or manually if no E2E gate). |

{{#E2E_GATE}}> **Phase 7 (E2E) is NOT part of `/run-issue`.** It runs in `/run-e2e`. After Phase 8 here, print the draft PR URL(s) and: `Next: /run-e2e <id-or-branch>`.{{/E2E_GATE}}

### Decomposition mechanics (Phase 1b detail)

When proposing a split:

1. Order children by dependency: contract / schema → backend logic → web/mobile clients → infrastructure.
2. Create each child via `{{TRACKER_CREATE_SUBISSUE}}`.
3. Link as sub-issue via `{{TRACKER_LINK_SUBISSUE}}`.
4. Add each child to the board / column "Todo" via `{{TRACKER_BOARD_ADD}}`.
5. Run only the first child through Phase 2 onward. Siblings wait for explicit `/run-issue <id>` invocations.

---

## Step 3 — Failure triage subroutine

Entered from Phase 5 only.

1. **Classify**: in-scope (caused by current changes) vs out-of-scope.
2. **In-scope** → fix → re-run failed gate. Iteration budget `{{ITER_BUDGET_RUN_ISSUE}}`. On exhaustion → escalate to human, STOP.
3. **Out-of-scope** → file autonomously:
   - Search existing issues via `{{TRACKER_SEARCH_CMD}}` → dedupe
   - If novel: `{{TRACKER_FILE_BUG_CMD}}` with labels `bug`, `discovered-in-test`, `discovered-by-claude`, `severity-<level>`
   - Add to board column **Backlog** via `{{TRACKER_BOARD_ADD}}`
   - Mode A: comment on parent issue. Both modes: notify user.
   - **Blocker severity** (security / data / availability) → ⏸ pause PR, ask human.
   - Non-blocker → continue iteration loop.

---

## Tracker reference

```
{{TRACKER_REFERENCE_BLOCK}}
```

---

## Final output

When Phase 8 completes:

```
Draft PR(s) opened:
  - <repo>: <PR URL>
  - ...

Issue: <ref> (still In Progress)
{{#E2E_GATE}}Next: /run-e2e <id-or-branch>{{/E2E_GATE}}{{^E2E_GATE}}Next: review the PR(s) and merge when ready{{/E2E_GATE}}
```

Do not proceed past this point.

---

## Hard rules

- **Never** merge or push to `main`. PR base is always `dev`. Hook `block-main-pushes.ps1` enforces this — do not try to bypass.
- **Never** auto-stash a dirty working tree.
- **Never** exceed the `{{ITER_BUDGET_RUN_ISSUE}}`-iteration budget without escalating.
- **Never** skip the high-risk human ACK gate when triggered.
- **Never** dismiss a blocker-severity finding without explicit human approval.
{{#E2E_GATE}}- **Never** mark a PR ready-for-review from this command — that's `/run-e2e`'s job.
- **Never** invoke `/run-e2e` automatically from within `/run-issue`. Use `/ship-issue` for chaining.{{/E2E_GATE}}
