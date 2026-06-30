---
description: End-to-end coordinator — runs /run-issue then /run-e2e in one shot.
argument-hint: <issue-id-or-url-or-prompt>
---

Run the **full issue-to-PR-ready workflow** by chaining `/run-issue` and `/run-e2e`. This is a thin coordinator — all logic lives in those two commands and in [`WORKFLOW.md`](../../WORKFLOW.md).

Use this when you want a single-command, end-to-end run and you have time to wait through the E2E gate. Prefer `/run-issue` (alone) when you only want implementation + draft PR and intend to run E2E later.

User input: `$ARGUMENTS`

---

## Behavior

1. **Invoke `/run-issue $ARGUMENTS`.**
   - Track progress via `TaskCreate` / `TaskUpdate`.
   - Honor every pause it raises (high-risk ACK, decomposition ACK, blocker decisions).
   - On success, capture the resolved **issue ID** (Mode A) or **branch name** (Mode B) and the draft PR URL(s).
   - On STOP without success (budget exhausted, dev unhealthy, decomposition pause) → **do not** auto-advance. Surface the STOP and exit.

2. **Invoke `/run-e2e <id-or-branch>`** with the identifier captured above.
   - Track progress (continuing the same task list).
   - Honor every interactive prompt.
   - On success, `/run-e2e` has marked the PR(s) ready-for-review and moved the issue to *In Review*.
   - On STOP without success → surface the STOP. PR(s) remain draft.

3. **Final output**:

```
✅ Shipped to review:
  - <repo>: <PR URL>
Issue: <ref> → In Review
```

Or, if E2E did not pass:

```
⚠️ Implementation complete, E2E gate not passed:
  - <repo>: <PR URL> (draft)
Issue: <ref> → still In Progress
Re-run /run-e2e <id-or-branch> after fixing.
```

---

## Hard rules (inherited)

- **Never** merge or push to `main`. PR base is always `dev`.
- **Never** run `/ship-issue` while another `/run-issue`, `/run-e2e`, or `/ship-issue` is in flight — dev is `{{DEV_POLICY}}` and they will race.
- **Never** skip the high-risk human ACK gate.
- **Never** auto-advance to `/run-e2e` if `/run-issue` did not reach a successful draft-PR state.
- **Never** dismiss a blocker (security / data / availability) without explicit human approval.
