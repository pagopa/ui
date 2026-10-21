# Figma drift handoff

The weekly drift job opens one pull request on `figma-drift/<date>`. The job has
already refreshed the inventory, queued the delta as `pending` and refreshed the
offline evidence. The alignment is done by the person and their local agent on
that branch; CI never runs a coding agent.

The agent procedure lives in the `figma-to-code` skill, drift handoff reference:
[handoff.md](../.agents/skills/figma-to-code/references/handoff.md). It covers the
worktree, the token or committed-evidence fallback, the work order, the checks
and the delivery.

The workflow uploads `delta.json`, `run.json` and `pr-body.md` as artifacts
(retention 14 days). The pull request body carries the classes, nodes, devices,
work order and summaries. The person pushes, reviews and merges; the merge is
the review record.

## Metrics

The workflow records two durations:

- `handoffPrAt − figmaChangeAt`: from the run start to the pull request creation,
  in `run.json`.
- `mergedAt − handoffPrAt`: read after the merge with
  `gh pr view <number> --json mergedAt`; a monthly query is enough.

The drift schedule stays weekly, Monday 04:00 UTC, until both metrics have been
measured.
