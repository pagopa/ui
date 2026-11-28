# Triage labels

Canonical five-role triage label vocabulary for GitHub Issues on `pagopa/ui`:

| Role              | Label string      | Meaning                                                                |
| ----------------- | ----------------- | ---------------------------------------------------------------------- |
| `needs-triage`    | `needs-triage`    | Newly opened or unreviewed issue awaiting initial triage.              |
| `needs-info`      | `needs-info`      | Blocked on missing context, reproduction steps, or owner decisions.    |
| `ready-for-agent` | `ready-for-agent` | Scoped and specified clearly enough for autonomous agent execution.    |
| `ready-for-human` | `ready-for-human` | Requires human engineering, design, or product review/implementation.  |
| `wontfix`         | `wontfix`         | Out of scope, declined, or intentionally not planned.                  |

## Rules

- Always apply the exact label strings from the table above.
- An open issue should carry at most one triage-role label at a time; remove the previous role label when transitioning states.
- If a label does not yet exist in `pagopa/ui`, create it before applying it rather than substituting a different name.
