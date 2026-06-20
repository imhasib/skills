# Module: ticketing/jira

Jira Cloud via REST API (`curl`). No native MCP. Same caveats as ClickUp — workable, slower than GitHub/Linear.

## Inputs (asked by SKILL.md when tracker = jira)

- `jira_site` — e.g. `karigor.atlassian.net`
- `jira_project_key` — e.g. `SPC`, `SIRR` (drives issue ID prefix `SPC-23`)
- `jira_transition_ids` — map of {Backlog, Todo, In Progress, In Review, Done} → transition IDs (Jira moves issues via "transitions," not direct status sets)
- `jira_email_env` — env var for the Jira account email; default `JIRA_EMAIL`
- `jira_token_env` — env var for the API token; default `JIRA_API_TOKEN`

## Auth

Jira Cloud uses HTTP Basic with email + API token:

```
curl -u "$JIRA_EMAIL:$JIRA_API_TOKEN" ...
```

Generate the token at `id.atlassian.com → Security → API tokens`.

## Substitutions for `workflow.md`

| Placeholder | Value |
|---|---|
| `{{TRACKER_NAME}}` | `Jira Cloud` |
| `{{TRACKER_FETCH_ISSUE}}` | `curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" "https://<site>/rest/api/3/issue/<key>"` |
| `{{TRACKER_CREATE_ISSUE}}` | `curl -s -X POST -u "$JIRA_EMAIL:$JIRA_API_TOKEN" -H "Content-Type: application/json" -d '<json>' "https://<site>/rest/api/3/issue"` |
| `{{TRACKER_MOVE_STATUS}}` | `curl -s -X POST -u "$JIRA_EMAIL:$JIRA_API_TOKEN" -H "Content-Type: application/json" -d '{"transition":{"id":"<transition-id>"}}' "https://<site>/rest/api/3/issue/<key>/transitions"` |
| `{{TRACKER_ADD_COMMENT}}` | `curl -s -X POST -u "$JIRA_EMAIL:$JIRA_API_TOKEN" -H "Content-Type: application/json" -d '{"body":{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"<msg>"}]}]}}' "https://<site>/rest/api/3/issue/<key>/comment"` |
| `{{TRACKER_LINK_SUBISSUE}}` | Jira "sub-task" issue type: create with `"issuetype":{"name":"Sub-task"}` + `"parent":{"key":"<parent-key>"}` |
| `{{TRACKER_BRANCH_PREFIX_EXAMPLE}}` | `SPC-23_logout_redirect` |
| `{{TRACKER_AUTH_NOTE}}` | Email in `JIRA_EMAIL`, token in `JIRA_API_TOKEN` — both env vars required. |

## Transition ID discovery

Renders into `<root>/docs/JIRA_SETUP.md`:

```bash
# List available transitions for a sample issue in your project
curl -s -u "$JIRA_EMAIL:$JIRA_API_TOKEN" \
  "https://<site>/rest/api/3/issue/<SPC-1>/transitions" | jq '.transitions[] | {id, name}'

# Map each transition name (Backlog, Todo, In Progress, In Review, Done) to its id
# Paste into WORKFLOW.md placeholders.
```

Note: Jira transitions are workflow-scheme-specific. The same status might have different transition IDs in different projects.

## Files stamped

- `<root>/docs/JIRA_SETUP.md` — token generation + transition discovery snippet
- `<root>/.env.example` — adds `JIRA_EMAIL=` and `JIRA_API_TOKEN=` placeholders

## Parent vs child detection

Sub-tasks are a distinct issue type. The parent issue's `fields.subtasks` lists them. Check `fields.parent` to see if an issue is a child.

## Hard rules

- Never commit Jira credentials — `.env.example` only
- Jira Cloud rate limits per token; back off on `429`
- Atlassian Document Format (ADF) is required for comment bodies — workflow commands must wrap plain strings in the ADF JSON shape shown above
- If either env var is unset at workflow runtime, STOP with clear setup instructions
