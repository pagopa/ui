# Definition of done — source alignment

For a component with a Figma node. Satisfied for each touched node before the
green chain.

- [ ] The rendered story matches the source variant at its width and state,
      numbers and images ([visual-parity.md](visual-parity.md)); every declared
      device has its case ([devices.md](devices.md)).
- [ ] The component story is the parity capture surface: source width, real
      states, `parameters.design` built with `figmaEmbedUrl`. Every export in
      `storyExports` shows the registry node — the set, not the variant — in its
      effective `parameters.design`. No fidelity fixture outside it.
- [ ] The guide in `code.guides` records the source mapping: which source
      property drives which prop, attribute or content. Figma layer names are
      quoted verbatim.
- [ ] Every consolidated rule that targets the node has a disposition; the
      consumer-facing ones are the guide's first block
      (`<!-- component-rules:start -->` … `<!-- component-rules:end -->`),
      under `## Component Rules` and with no source reference in the text; the
      open comments are read and either answered by the source or promoted to a
      design request ([rules.md](rules.md)).
      No targeting rule remains `pending` or `stale`.
- [ ] The name and props follow [prop-conventions.md](prop-conventions.md);
      every departure is one line in the node's registry `note`.
- [ ] The registry entry has `target.module`, `target.export`, `target.story`,
      explicit `target.storyExports`, and `status: "implemented"` only after
      inspecting the source and the render ([catalogue.md](catalogue.md)).
- [ ] Automated a11y and render checks are not screen-reader or browser-zoom
      certification: report them as unverified.

## Closing and delivery

1. Satisfy the checklist for every node claimed implemented. Excluded nodes
   carry a reason; pending nodes name their request or blocker
   ([catalogue.md](catalogue.md#review-semantics)).
2. With Storybook answering, run
   `pnpm ui-cli figma close --nodes <id,id> --json` for the exact touched set.
   It runs catalogue, strict rules, devices and evidence checks, every selected
   node's saved parity cases, docs, then `pnpm nx run workspace:verify`.
   `--nodes` and `--base` are alternatives: without explicit nodes the CLI uses
   changed registry/case entries against the base (default merge-base with
   `origin/main`), falling back to the pending queue. That fallback can check
   the wrong scope for a targeted review; prefer `--nodes`.
   Use [parity-tooling.md](parity-tooling.md) to read results. All steps must
   pass; unavailable browser steps and `--skip-chain` are not full verification,
   even if a process exits 0. A committed-only use case with no touched node
   runs the full workspace chain directly.
3. For a parity wave, preserve its per-node capture/report records
   ([visual-parity.md](visual-parity.md#close-the-wave)); `figma close` does not
   generate them. Drift delivery also owes the baseline preflight and
   before/after media in [handoff.md](handoff.md#checks-and-delivery).
4. **Delivery permission stop.** Report and ask before commit, push or pull
   request unless the person already requested that action. On a drift branch,
   an authorized commit stays there; the person pushes and merges. Keep the
   stories, registry, inventory and exception changes with the implementation.
5. Complete the close report's placeholders: what changed; each node's decision
   and reason; each device's verdict; residues and reasons; open items and why;
   files touched; every command and exit code. Include human image-inspection
   findings and any unverified baseline, browser or assistive-technology step.

**Done when** the exact node scope satisfies source alignment, the full green
chain is green, required wave/media evidence is reviewed, and the report
distinguishes passed, failed, skipped and unavailable work. Otherwise report a
blocked or partially verified result; do not claim completion.
