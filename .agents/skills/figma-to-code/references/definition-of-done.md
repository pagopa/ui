# Definition of done — source alignment

For a component with a Figma node. Satisfied for each touched node before the
green chain.

- [ ] The rendered story matches the source variant at its width and state,
      numbers and images ([visual-parity.md](visual-parity.md)); every declared
      device has its case ([devices.md](devices.md)).
- [ ] The component story is the parity capture surface: source width, real
      states, `parameters.design` built with `figmaEmbedUrl`. No fidelity
      fixture outside it.
- [ ] The guide in `code.guides` records the source mapping: which source
      property drives which prop, attribute or content. Figma layer names are
      quoted verbatim.
- [ ] Props follow [prop-conventions.md](prop-conventions.md); every departure
      is one line in the node's registry `note`.
- [ ] The registry entry has `target.module`, `target.export`, `target.story`,
      explicit `target.storyExports`, and `status: "implemented"` only after
      inspecting the source and the render ([catalogue.md](catalogue.md)).
- [ ] Automated a11y and render checks are not screen-reader or browser-zoom
      certification: report them as unverified.
