# A1 — Fidelity tooling: a reproducible proof and a gate on the delta

Common rules: [README.md](./README.md). Source: assessment §5, action A (tooling
part). Depends on F0. Can run in parallel with B, C and D (it does not touch the
components).

## Goal

Turn Figma fidelity into a **reproducible proof**, runnable in CI without the
160 MB snapshot, and into a **gate on the delta**: every node touched by a drift
pull request must have a verified comparison, with any differences justified.

## Decisions already made

- **Visual baseline = Chromatic, on request (opt-in).** It does not run by
  default and does not block the merge. It is started by hand or with a pull
  request label. This supersedes decision D1 of the parity handoff document
  (committed Playwright): the opt-in Chromatic choice wins.
- The fidelity gate on the delta is the **numeric Figma → render comparison**
  (tools `scripts/figma-parity`), not Chromatic.
- The Figma token is `FIGMA_TOKEN` in the environment, read-only (common rules).
- Action **A9 `variantMap`** of the parity handoff document is **not** done: it is
  replaced by flow B (a prop convention, no declarative map).

## Detailed specification (to read)

- `docs/reports/2026-10-15-figma-parity-hardening-handoff.md`: A5, A6, A7, A11
  (with decision D1 superseded as above).
- `scripts/README.md` and the `figma-to-code` skill for the existing commands.

## Scope and files

Ownership: `scripts/figma-parity/*` (+ tests), `scripts/figma-devices.mjs` and
`src/catalog/figma/device-policy.json` (for the "Order" axis), `.storybook/` for
the Chromatic configuration, the committed comparison images, the gate row in
`figma:check`. Do not touch the components: a component defect found by a
comparison goes into the report and to A2.

## Procedure

1. **A5 — committed reference slice.** A command (name of your choosing, e.g.
   `figma:parity:reference`) that writes into the repository the structure
   numbers of every frame needed by `check`/`verify` and makes them usable
   without the snapshot and without the token. Hermetic and small format
   (thousands of lines, not 160 MB).
2. **A7 — reference image per case.** For every case, the pinned Figma frame PNG
   (the image is small) and the numeric report, both committed. Export with the
   Figma API in read-only mode.
3. **A6 — CI-friendly verification.** A command that, without network or browser,
   checks the schema, references, queue and case diffs; it fails if the images or
   the references have gone stale. Register it in the full check.
4. **Gate on the delta.** Extend `figma:check`: a node changed by the drift pull
   request (state `pending` or with a changed design fingerprint) does not leave
   `pending` without at least one verified case for every declared device, or a
   reasoned exception (`device-exceptions.json`). Historical nodes without a case
   stay in the queue and do not block the rest. Coverage can only grow. Keep the
   device coverage already in `figma:check` and wire it to this gate.
5. **Side-by-side comparison in the pull request.** The body of the drift pull
   request contains, for every node of the delta, the Figma image, the component
   image and the difference (or references to the committed files).
6. **Chromatic on request.** Configure the story baseline at two widths (mobile
   360–390px, desktop) with `@chromatic-com/storybook` (already present).
   Trigger: `workflow_dispatch` or a pull request label, never by default. The
   token is the `CHROMATIC_PROJECT_TOKEN` secret (the agent writes the workflow
   and the list of secrets but does not insert them). If the workflow in
   `.github/workflows/` does not exist yet, add only the baseline one and leave
   the rest to flow E.
7. **"Order" axis.** `figma:check` warns that the "Order" axis of 127:1510
   contains the value "Mobile", a device name. Resolve the warning (split the
   axis or complete the policy) without component names in the policy.

## Acceptance

Commands: `pnpm test:tooling && pnpm figma:check`, the new verification command
(A6), and the full check of `AGENTS.md`.

Proofs:

- a synthetic drift pull request (inventory modified on a test branch) makes the
  gate fail for a node without a case and lets it pass once the case exists; the
  branch is not merged;
- `check`/`verify` run on a clone **without** `.figma/` and without a token;

## To ask the person

- Acceptable size of the committed images if it exceeds a few MB in total
  (otherwise Git LFS or restrict to the main components).

## Out of scope

- Aligning the components (A2) and fixing the defects the comparisons find.
- The general CI workflows and starting the agent in CI (E).
