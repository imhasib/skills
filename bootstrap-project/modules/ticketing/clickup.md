# Module: ticketing/clickup

ClickUp via HTTP API (`curl`). No native MCP — operations are explicit `curl` invocations driven by the workflow command. Slower iteration than GitHub/Linear but workable.

## Inputs (asked by SKILL.md when tracker = clickup)

- `clickup_workspace_id` — numeric ID from the URL
- `clickup_space_id` — numeric Space ID
- `clickup_list_id` — numeric List ID (where issues live)
- `clickup_status_names` — map of {Backlog, Todo, In Progress, In Review, Done} → ClickUp status strings (ClickUp uses status names, not IDs, for the API)
- `clickup_token_env` — name of env var holding the API token; default `CLICKUP_API_TOKEN`

## Substitutions for `workflow.md`

All commands use `curl` with `Authorization: $CLICKUP_API_TOKEN`. Workflow expects the token to be exported in the user's shell environment.

| Placeholder | Value |
|---|---|
| `{{TRACKER_NAME}}` | `ClickUp` |
| `{{TRACKER_FETCH_ISSUE}}` | `curl -s -H "Authorization: $CLICKUP_API_TOKEN" "https://api.clickup.com/api/v2/task/<id>"` |
| `{{TRACKER_CREATE_ISSUE}}` | `curl -s -X POST -H "Authorization: $CLICKUP_API_TOKEN" -H "Content-Type: application/json" -d '<json>' "https://api.clickup.com/api/v2/list/<list-id>/task"` |
| `{{TRACKER_MOVE_STATUS}}` | `curl -s -X PUT -H "Authorization: $CLICKUP_API_TOKEN" -H "Content-Type: application/json" -d '{"status":"<status-name>"}' "https://api.clickup.com/api/v2/task/<id>"` |
| `{{TRACKER_ADD_COMMENT}}` | `curl -s -X POST -H "Authorization: $CLICKUP_API_TOKEN" -H "Content-Type: application/json" -d '{"comment_text":"<msg>"}' "https://api.clickup.com/api/v2/task/<id>/comment"` |
| `{{TRACKER_LINK_SUBISSUE}}` | `curl -s -X POST -H "Authorization: $CLICKUP_API_TOKEN" "https://api.clickup.com/api/v2/task/<parent-id>/subtask/<child-id>"` |
| `{{TRACKER_BRANCH_PREFIX_EXAMPLE}}` | `<list-prefix>-23_logout_redirect` (ClickUp custom task IDs depend on workspace config; fall back to numeric task ID if no prefix) |
| `{{TRACKER_AUTH_NOTE}}` | Token in `CLICKUP_API_TOKEN` env var (generate at ClickUp → Settings → Apps → API). Add to your `.bashrc` / `.zshrc` / PowerShell profile. |

## Files stamped

- `<root>/docs/CLICKUP_SETUP.md` — how to generate an API token, list space/list IDs, paste into WORKFLOW.md
- `<root>/.env.example` — adds `CLICKUP_API_TOKEN=` placeholder

## Parent vs child detection

ClickUp task response includes `parent` and `linked_tasks` fields. Check `parent` to identify children; use a separate `GET /task/<id>/subtask` to list children.

## Hard rules

- Never commit the ClickUp API token — only document via `.env.example`
- HTTP API is rate-limited (100 req/min per token) — back off on `429`, max 3 retries
- If `$CLICKUP_API_TOKEN` is unset at workflow runtime, STOP and surface clear setup instructions; do not silently fail
