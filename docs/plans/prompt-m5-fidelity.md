You are implementing the next wave of M5 of `docs/plans/figma-fidelity-and-drift.md`
(at most three nodes).

Work in a dedicated worktree on a branch created from `main`, never on `main`.
Do not push, do not merge and do not open a pull request: the person does that.

Hard rules:
- Figma is read-only. Use GET requests and the read-only MCP tools only.
- Never read, source, print or commit `.env`. Use `FIGMA_TOKEN` from the process
  environment only when a live step needs it. If it is missing, stop that step
  and continue with the committed evidence bundle.
- Every command goes through Nx (`pnpm nx run <project>:<target>`). Exception:
  `parity check` arguments containing spaces or `|` (a multi-axis `--state`, a
  `--note`) are mangled by Nx's argument forwarding; run those through the
  tooling's own entry point, `pnpm --filter pagopa-ui-cli exec node src/cli.ts
  parity ...`, which is what the skill's examples use.

Read first:
- `docs/plans/README.md` and `docs/plans/figma-fidelity-and-drift.md` (M5,
  scope order, procedure, the named blockers)
- `.agents/skills/figma-to-code/SKILL.md` and its references:
  `visual-parity.md`, `parity-tooling.md`, `devices.md`,
  `definition-of-done.md`, `node-review.md`, `design-request.md`
- `packages/ui-cli/README.md` and `docs/figma-parity/README.md`
- the registry notes of the nodes you pick

Pick the next three nodes from the queue and the plan's implementation order,
skipping the ones blocked by an open design request.

The already blocked nodes stay pending and are not part of this wave:
`DragAndDrop 760:7432`, `TimelineDrawer 1333:16408`, `TableCellRow 1344:40672`,
`Pagination 127:1510`; `Drawer 1278:6527` waits on DragAndDrop.

Environment:
- The pinned snapshot lives at `packages/pagopa-ui/.figma/live-rest.json`
  (package-relative, not the repository root). A new worktree does not have it:
  symlink that directory into the worktree, or re-export it with
  `pnpm nx run pagopa-ui-cli:figma:export`. The committed evidence slice only
  contains the nodes the 103 reviewed cases point at, so the new nodes need the
  snapshot.
- Storybook: `pnpm nx run pagopa-ui-storybook:storybook -- -p 6010` and
  `STORYBOOK_URL=http://localhost:6010`.
- The committed evidence bundle is gzipped (`docs/figma-parity/source.json.gz`);
  `parity check` reads it transparently. `parity verify` is currently ok.

For each node:
1. Read the registry note, the guide and the existing cases. The note is binding.
2. Run `parity check --node <id> --devices` when the set has a device axis, and
   `parity check --case <id>` for every committed case.
3. Propose the missing cases with `parity cases --sync --node <id> --dry-run`;
   a draft is not coverage.
4. Fix the component or the story; at most three passes per case; then record a
   residue with a reason or a written blocker.
5. Save the reviewed case with `--save-case --note "reviewed: …"`, update the
   registry (`status`, `target`, `storyExports`, note) and the changelog when
   rendering or the API changes.
6. Run the targeted tests and the full green chain
   (`CONTRIBUTING.md#the-green-chain`). Stories run in a browser: when they
   cannot start, say so and never count them as passed.
7. One commit per node, conventional message.

After the wave:
- Refresh the evidence bundle with
  `pnpm nx run pagopa-ui-cli:figma:parity:evidence -- --write` (needs
  `FIGMA_TOKEN` and the snapshot): the new cases have no manifest entry until
  then, and `parity verify` fails on that. Commit the refreshed bundle on its
  own (`chore(figma-parity): …`); the gzipped slice keeps the bundle under the
  10 MB cap.
- Run `pnpm nx run pagopa-ui-cli:figma:parity:verify`; it must be ok (the two
  known device warnings for the design-blocked nodes are expected).

Never mark a node `implemented` without a reviewed render. Never absorb a design
decision: write it under `docs/design-requests/` and leave the node `pending`.

Report per node: cases, verdicts, residues, status, files, commands. Close with
before/after numbers (pending, implemented, cases, unmapped, device coverage,
evidence size), the full green chain result, what is missing and why, and the
decisions that need the person. 