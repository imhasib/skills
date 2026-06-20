# Module: ticketing/none

No tracker. All work runs in "Mode B" — free-text prompts. Branches use the slug only; no auto-created issues, no status moves.

## Inputs

None.

## Substitutions for `workflow.md`

| Placeholder | Value |
|---|---|
| `{{TRACKER_NAME}}` | `none (untracked)` |
| `{{TRACKER_FETCH_ISSUE}}` | _N/A_ — Mode B only; spec comes from the user's prompt |
| `{{TRACKER_CREATE_ISSUE}}` | _N/A_ |
| `{{TRACKER_MOVE_STATUS}}` | _N/A_ |
| `{{TRACKER_ADD_COMMENT}}` | _N/A_ |
| `{{TRACKER_LINK_SUBISSUE}}` | _N/A_ |
| `{{TRACKER_BRANCH_PREFIX_EXAMPLE}}` | `fix_swipe_jitter` |
| `{{TRACKER_AUTH_NOTE}}` | No auth required — no tracker integration |

## Workflow adjustments

- Phase 0 (intake): never tries to fetch/create a tracker issue. The user's prompt IS the spec.
- Branch naming: `<snake_slug>` only — no ID prefix.
- PR body: under "Context" heading, embed the original prompt verbatim. No `Closes #N` line.
- Phase 1b decomposition: still applies, but children are tracked as a checklist inside the PR description rather than as separate tracker items.
- `/run-issue` still produces draft PRs and stops there. `/run-e2e` (if E2E gate is on) still finalizes.

## When to pick this

- Solo prototypes
- Early-stage projects where tracker overhead exceeds value
- Throwaway experiments

For anything you intend to ship, prefer a real tracker — even GitHub Issues — so changes are auditable.

## Files stamped

None tracker-specific. Workflow doc references "Mode B only" throughout.

## Hard rules

- Even with no tracker, the PR base rule (`dev`, never `main`) still applies
- The block-main-pushes hook is still stamped
- If the user later adopts a tracker, switch by running `/upgrade-project tracker` (future command) — do not edit modules retroactively
