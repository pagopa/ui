# A stopped run

An alignment run pauses at its checkpoint, or stops on a gate, and writes what it
saw beside it: `status.json` next to `decisions.json`, both under
`packages/pagopa-ui/.figma/align/<runId>/`. The workflow journal owns replay; the
projection is the run's own report of its last observation — never a verdict,
never a replay authority. `completed` says the orchestration ended, not that the
nodes are green.

## Read a stopped run

1. Read `status.json` and answer with its `outcome` quoted as written —
   `running`, `awaiting-approval`, `analysis-only`, `completed`, `blocked`,
   `failed` or `cancelled` — never a paraphrase of it ("paused for approval") and
   never one inferred from the branch or from progress.
2. Quote `decisionsFile` and `nextStep` as recorded: the full path of the
   checkpoint to edit, and the act that follows it. A paused run resumes with
   `run_dynamic_workflow { resumeFromRunId: "<runId>" }`, never a new run for the
   same wave.
3. Report the projection as an observation; it does not make the alignment done,
   verified or green.
4. Change nothing while reporting — not the checkpoint, not a writer, not a
   workspace gate. `.figma` is ignored output, so a rewrite is unrecoverable.

Report it in this shape, copying the three values out of the artifacts:

```
Outcome: awaiting-approval
Checkpoint: packages/pagopa-ui/.figma/align/<runId>/decisions.json
Then: run_dynamic_workflow { resumeFromRunId: "<runId>" }
```

## An edited checkpoint

`decisions.json` must match the wave in the `decisions.md` beside it: exactly one
entry per wave node, each with a `decision` from `implement`, `review`, `map`,
`exclude`, `design-request`, `skip`. Read both, then report every problem at
once — a node entered twice, a decision outside the six, a node the wave does not
contain, a wave node left without an entry — naming each node by the id the wave
gives it (`1:1`, `2:7`), not by the component it names, with the correction and
the resume that follows it (`run_dynamic_workflow { resumeFromRunId: "<runId>" }`).
Leave the file as found and start no writer until the person asks for the fix.

**Done when** the outcome, the checkpoint path and the resume are quoted from the
run's artifacts, and nothing was written.
