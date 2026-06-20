---
description: Run Phase 7 (Appium E2E loop) on an existing draft PR, then finalize the PR.
argument-hint: <issue-id-or-branch>
---

Run the **E2E gate** as defined in [`WORKFLOW.md`](../../WORKFLOW.md). That document is the source of truth.

Prerequisite: `/run-issue` has completed and a draft PR exists with the staging deploy live. This command picks up there.

User input: `$ARGUMENTS`

---

## Step 1 — Resolve target

- **Issue reference** (matches `{{TRACKER_ISSUE_PATTERN}}`) → fetch the draft PR(s) linked to this issue. Mode A.
- **Branch name** → fetch the draft PR(s) opened from that branch in each in-scope repo. Mode B (untracked).
- **Empty** → ask the user for the issue ID or the branch name, then re-enter Step 1.

If no draft PR is found, STOP and tell the user to run `/run-issue` first.

---

## Step 2 — Deploy-check

Confirm the staging deployment matches the branch under test:

1. Read `https://{{STAGING_DOMAIN}}/health` — should respond `200` with a build SHA.
2. The build SHA must match `git rev-parse HEAD` on the branch (in `{{PROJECT}}-core`).
3. Gap detected? Ask the user: *"Staging SHA doesn't match. Redeploy now, or abort?"*

---

## Step 3 — APK preparation

Only if `{{PROJECT}}-app/` was touched on this branch (check `git log dev..HEAD -- ../{{PROJECT}}-app`):

1. Build the release APK per `{{PROJECT}}-app-tests`'s README
2. Copy into `{{PROJECT}}-app-tests/apps/{{PROJECT}}.apk`

Otherwise reuse the existing APK.

---

## Step 4 — Run the suite

```bash
cd {{PROJECT}}-app-tests
{{PACKAGE_MANAGER}} install
{{PACKAGE_MANAGER}} test
```

Iteration budget: `{{ITER_BUDGET_RUN_E2E}}`.

On failure → enter triage:

1. **Classify** each failure as in-scope / out-of-scope / blocker (per `WORKFLOW.md` triage subroutine).
2. **In-scope** → delegate to the right specialist (likely `mobile-specialist` for widget-key changes, `backend-specialist` for API contract). Fix → push → wait for staging redeploy → re-run.
3. **Out-of-scope** → file a tracker ticket via `{{TRACKER_FILE_BUG_CMD}}`, do not block PR.
4. **Blocker** → ⏸ pause for human decision.

On budget exhaustion → STOP. PR stays draft. Print iteration log + the failing specs.

---

## Step 5 — Finalize

On clean pass:

1. Mark each PR ready-for-review:
   ```bash
   gh pr ready <pr-url>     # GitHub
   # Other trackers: {{TRACKER_PR_READY_CMD}}
   ```
2. Mode A: move issue to **In Review** via `{{TRACKER_MOVE_IN_REVIEW}}`.
3. Print:
   ```
   ✅ E2E passed. PRs marked ready-for-review:
     - <repo>: <PR URL>
   Issue: <ref> → In Review
   ```

---

## Hard rules

- **Never** auto-mark a PR ready-for-review if the E2E budget is exhausted
- **Never** overlap with another `/run-issue` or `/run-e2e` when staging is `{{STAGING_POLICY}}` and equals `single-tenant`
- **Never** rebuild the APK from a branch other than the one under test — the deploy-check must verify
- **Never** dismiss a blocker (security / data / availability) without explicit human ACK
- **Never** auto-merge the PR — the workflow stops at ready-for-review
