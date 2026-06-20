# Module: ticketing/github

GitHub Issues + Projects, driven via the `gh` CLI. Matches the SC repos pattern (locked decision #1 in sc's `WORKFLOW.md`).

## Inputs (asked by SKILL.md when tracker = github)

- `gh_owner` — default `imhasib`
- `gh_repos` — map of `<repo-folder>` → `<owner>/<repo-name>` for every opted-in code repo
- `gh_project_number` — integer; defer to `<FILL_IN>` if unknown
- `gh_project_id` — `PVT_*` node ID; defer
- `gh_status_field_id` — `PVTSSF_*`; defer
- `gh_status_option_ids` — map of {Backlog, Todo, In Progress, In Review, Done} → option IDs; defer
- `gh_token_env` — env var name holding the `gh` auth token; default uses `gh auth login` (no env var)

## Substitutions for `workflow.md`

| Placeholder | Value |
|---|---|
| `{{TRACKER_NAME}}` | `GitHub Issues + Projects` |
| `{{TRACKER_FETCH_ISSUE}}` | `gh issue view <id> --repo <owner/repo> --json number,title,body,labels,assignees,projectItems` |
| `{{TRACKER_CREATE_ISSUE}}` | `gh issue create --title "<t>" --body "<b>" --repo <owner/repo>` then `gh project item-add <gh_project_number> --owner <gh_owner> --url <issue-url>` |
| `{{TRACKER_MOVE_STATUS}}` | `gh project item-edit --id <item-id> --field-id <gh_status_field_id> --project-id <gh_project_id> --single-select-option-id <option-id-from-map>` |
| `{{TRACKER_ADD_COMMENT}}` | `gh issue comment <id> --repo <owner/repo> --body "<msg>"` |
| `{{TRACKER_LINK_SUBISSUE}}` | GraphQL: `gh api graphql -f query='mutation { addSubIssue(input: {issueId: "<PARENT_NODE_ID>", subIssueId: "<CHILD_NODE_ID>"}) { issue { id } } }'` — get node IDs via `gh issue view <n> --json id` |
| `{{TRACKER_BRANCH_PREFIX_EXAMPLE}}` | `42_logout_redirect` |
| `{{TRACKER_AUTH_NOTE}}` | `gh auth login` once on the machine — no per-project token needed |

## Project board lookup

If `gh_project_id` / `gh_status_field_id` / option IDs are not known at bootstrap, the user can run this snippet later (renders into `<root>/docs/GITHUB_PROJECT_SETUP.md`):

```bash
# Get project ID
gh api graphql -f query='query{ user(login:"<owner>"){ projectV2(number: <n>){ id title } } }'

# Get field IDs and option IDs
gh api graphql -f query='query{ user(login:"<owner>"){ projectV2(number: <n>){ fields(first:20){ nodes { ... on ProjectV2SingleSelectField { id name options { id name } } } } } } }'
```

Paste the IDs into the rendered `WORKFLOW.md` placeholders.

## Sub-issue mechanics (decomposition)

When Phase 1b decomposition triggers a split:

1. Create each child: `gh issue create --title "<parent-title> — <slice>" --body "..." --repo <owner/repo>`
2. Link as sub-issue via GraphQL `addSubIssue` mutation
3. Add child to project (status: Todo)
4. Run only the first child through Phase 2 onward; siblings wait

## Parent vs child detection

Pre-Phase-1b, check whether the issue has children:

```bash
gh api graphql -f query='query { repository(owner:"<owner>", name:"<repo>") { issue(number: <id>) { subIssues(first: 50) { totalCount nodes { number title state } } parent { number title } } } }'
```

- Has open children → it's a parent; list children, ask which to run, STOP.
- Has a parent → it's a child; skip Phase 1b size check, proceed to 1c.
- Neither → atomic; full Phase 1 applies.

## Files stamped

- `<root>/docs/GITHUB_PROJECT_SETUP.md` — the ID-discovery snippet + a paste-template for the option IDs
- `<root>/.github/ISSUE_TEMPLATE/feature.md` — feature request template
- `<root>/.github/ISSUE_TEMPLATE/bug.md` — bug template
- `<root>/.github/pull_request_template.md` — PR template with "Closes #<id>" + test plan checklist + E2E status

## Hard rules

- Never push branches to GitHub before the user wires `git remote add origin ...` (bootstrap only does local commits)
- Never auto-create issues without human ACK on Mode A auto-create flow
- Never embed a personal access token in any stamped file — `gh auth login` handles auth
