# Issue tracker

Issues for this repository live in **GitHub Issues** on `pagopa/ui` (`https://github.com/pagopa/ui`).

## Tooling

Read and write issues with the GitHub CLI (`gh`), targeting the current repository:

- List issues: `gh issue list`
- Read an issue: `gh issue view <number>`
- Create an issue: `gh issue create --title "..." --body "..." --label "..."`
- Update labels or body: `gh issue edit <number> --add-label "..." --remove-label "..."`
- Comment on an issue: `gh issue comment <number> --body "..."`

## Conventions

- Write issue titles, bodies, and comments in English (see `AGENTS.md` Rule 5).
- Apply triage labels using the exact strings defined in [triage-labels.md](./triage-labels.md).
- Link related specs, tickets, ADRs (`docs/decisions/`), and pull requests by GitHub issue/PR number.
- Design questions for the Figma design owner continue to follow the `figma-to-code` design-request flow (`docs/design-requests/`).

## PRs as a request surface

- **Enabled:** `false` (default — only GitHub Issues enter the triage queue).
