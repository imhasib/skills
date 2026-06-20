# bootstrap-project

A Claude Code skill that scaffolds a new multi-repo project workspace from a PRD, following the conventions distilled from the SIRR and Speaking Club codebases.

## What it does

Run `/bootstrap-project` from any new empty directory containing a `PRD.md`. The skill:

1. Reads the PRD for context
2. Asks an interactive Q&A to lock in choices (tech stack, services, tracker, branching, monitoring, testing tiers, etc.)
3. Stamps out the matching repo tree, `.claude/` team setup, deployment infra, CI workflows, and workflow docs
4. Loads only the modules you opted into — unused modules are ignored

## Layout

```
SKILL.md              — orchestrator (Q&A + dispatch)
modules/              — one MD per concern, loaded on demand
  tech-stack.md
  api-contract.md
  coding-practices.md
  microservices.md
  deployment.md
  cicd.md
  monitoring.md
  testing-{unit,integration,e2e}.md
  git-flow.md
  agent-team.md
  workflow.md
  realtime.md
  ticketing/        — pick ONE: github | linear | clickup | jira | none
templates/            — files stamped into the new workspace
```

## Install

Canonical location: `E:\org-karigor\skills\bootstrap-project\` (this folder).

Discovered by Claude Code via symlink at `C:\Users\Hasib\.claude\skills\bootstrap-project`.

## Evolving the skill

Every module is plain Markdown. Edit anytime; changes take effect on the next `/bootstrap-project` invocation. Already-bootstrapped projects don't back-propagate — they're frozen copies. Use commits + tags here to track skill versions across stamped projects.

## Reference repos

- `E:\org-karigor\sirr\sirr-repos`
- `E:\org-karigor\speaking-club\sc-repos`

These are the source material the modules are distilled from.
