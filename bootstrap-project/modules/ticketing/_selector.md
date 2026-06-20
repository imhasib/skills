# Module: ticketing/_selector

The router that SKILL.md uses to pick exactly one ticketing module based on the `tracker` answer.

## Inputs

- `tracker` — `github` | `linear` | `clickup` | `jira` | `none`

## Dispatch

| `tracker` | Load |
|---|---|
| `github` | `ticketing/github.md` |
| `linear` | `ticketing/linear.md` |
| `clickup` | `ticketing/clickup.md` |
| `jira` | `ticketing/jira.md` |
| `none` | `ticketing/none.md` |

Exactly one. Never two.

## What each provider module must export

Every `ticketing/<provider>.md` provides a substitution table that the `workflow.md` rendering step plugs into the new `WORKFLOW.md`:

| Placeholder | Provider supplies |
|---|---|
| `{{TRACKER_NAME}}` | Display name (e.g. "GitHub Issues", "Linear") |
| `{{TRACKER_FETCH_ISSUE}}` | Concrete command/MCP call to fetch an issue by ID |
| `{{TRACKER_CREATE_ISSUE}}` | Concrete command to create an issue |
| `{{TRACKER_MOVE_STATUS}}` | Concrete command to move an issue to a named status |
| `{{TRACKER_ADD_COMMENT}}` | How to post a comment (used for PR link cross-posting) |
| `{{TRACKER_LINK_SUBISSUE}}` | How to link a child issue to a parent (decomposition) |
| `{{TRACKER_BRANCH_PREFIX_EXAMPLE}}` | Sample branch prefix (`42_`, `SPC-23_`, etc.) |
| `{{TRACKER_AUTH_NOTE}}` | One-line note on how auth is wired (`gh` token, MCP, env var) |

Each module also stamps any tracker-specific config files (e.g. `.github/ISSUE_TEMPLATE/`).

## Hard rules

- Never load more than one tracker module
- Never bake credentials into stamped files — reference env vars only
- If tracker config has unresolved IDs at bootstrap time (e.g. project number not known yet), stamp the placeholder string `<FILL_IN>` and surface in the final summary as a deferred item
