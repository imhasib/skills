# Module: ticketing/linear

Linear via the native `mcp__claude_ai_Linear__*` MCP tools. Recommended when Linear is the team's source of truth — better than CLI because the MCP exposes typed operations.

## Inputs (asked by SKILL.md when tracker = linear)

- `linear_workspace_url` — e.g. `https://linear.app/karigor` (used in PR-link comments)
- `linear_team_key` — e.g. `SPC`, `SIRR` (drives issue ID prefix)
- `linear_team_id` — UUID; defer to `<FILL_IN>` if not handy (fetch later with `mcp__claude_ai_Linear__list_teams`)
- `linear_state_ids` — map of {Backlog, Todo, In Progress, In Review, Done} → state UUIDs; defer (fetch with `mcp__claude_ai_Linear__list_issue_statuses --teamId <id>`)
- `linear_project_id` — optional project UUID, if the team groups issues under a project
- `linear_default_cycle` — optional; current cycle UUID for auto-assigning new issues

## Substitutions for `workflow.md`

| Placeholder | Value |
|---|---|
| `{{TRACKER_NAME}}` | `Linear` |
| `{{TRACKER_FETCH_ISSUE}}` | `mcp__claude_ai_Linear__get_issue` with `id: "<ID>"` (accepts `<team-key>-<n>` or UUID) |
| `{{TRACKER_CREATE_ISSUE}}` | `mcp__claude_ai_Linear__save_issue` with `teamId`, `title`, `description`, `stateId` (Todo), optional `projectId` and `cycleId` |
| `{{TRACKER_MOVE_STATUS}}` | `mcp__claude_ai_Linear__save_issue` with `id` + `stateId: <state-id-from-map>` |
| `{{TRACKER_ADD_COMMENT}}` | `mcp__claude_ai_Linear__save_comment` with `issueId`, `body` |
| `{{TRACKER_LINK_SUBISSUE}}` | `mcp__claude_ai_Linear__save_issue` with `parentId: "<parent-id>"` on the child |
| `{{TRACKER_BRANCH_PREFIX_EXAMPLE}}` | `SPC-23_logout_redirect` |
| `{{TRACKER_AUTH_NOTE}}` | Linear MCP auth is handled by the Claude.ai integration; no per-project setup needed |

## State / ID discovery snippet

Renders into `<root>/docs/LINEAR_SETUP.md`:

```
# Discover team + state IDs once, paste into WORKFLOW.md

1. List teams:
   mcp__claude_ai_Linear__list_teams

   Find your team; copy the UUID into linear_team_id.

2. List states for that team:
   mcp__claude_ai_Linear__list_issue_statuses with teamId: "<your-team-id>"

   Map each state name (Backlog, Todo, In Progress, In Review, Done) to its UUID.

3. Paste both into WORKFLOW.md placeholders.
```

## Issue ID format

Linear issues are addressed as `<team-key>-<number>` (e.g. `SPC-23`). The branch naming convention becomes `<team-key>-<number>_<snake_slug>` (e.g. `SPC-23_logout_redirect`). The block-main-pushes hook is unaffected.

## Decomposition mechanics

Linear supports parent → sub-issue natively via `parentId`. No separate link mutation needed.

1. Create each child with `save_issue` including `parentId: "<parent-issue-id>"`.
2. Set state to Todo (or your "ready" equivalent).
3. Run only the first child through Phase 2 onward.

## Parent vs child detection

`mcp__claude_ai_Linear__get_issue` returns `parent` and `children` fields. Same logic as GitHub:

- Has open children → parent; pause and ask which child.
- Has parent → child; skip 1b size check.
- Neither → atomic.

## Files stamped

- `<root>/docs/LINEAR_SETUP.md` — discovery snippet + paste-template for IDs
- (No template files needed — Linear has no equivalent to `.github/ISSUE_TEMPLATE/`)

## Hard rules

- Never use `gh` CLI for tracker operations when tracker = linear (no mixing)
- Never bypass the MCP auth layer — no API tokens in stamped files
- If a state ID is `<FILL_IN>`, the workflow command should detect this at runtime and prompt the user to fill it before proceeding (don't run with placeholders)
