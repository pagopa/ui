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
- [ ] The name and props follow [prop-conventions.md](prop-conventions.md);
      every departure is one line in the node's registry `note`.
- [ ] The registry entry has `target.module`, `target.export`, `target.story`,
      explicit `target.storyExports`, and `status: "implemented"` only after
      inspecting the source and the render ([catalogue.md](catalogue.md)).
- [ ] Automated a11y and render checks are not screen-reader or browser-zoom
      certification: report them as unverified.
