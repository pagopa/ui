# New component from a Figma node

The node is in `catalog.inventory` and `pending` (or the person names it). A
component with no node needs only its catalogue coverage
([new-without-node.md](new-without-node.md)).

## Steps

1. **Read the source.** `pnpm nx run pagopa-ui-cli:figma:brief --node <nodeId>`
   gives the catalogue decision, the rules that target the node, the open
   comments and the open design requests ([rules.md](rules.md)); refresh the
   local rules snapshot when the session started on a file that may have
   changed. `node packages/ui-cli/src/cli.ts parity source <nodeId> --depth 1`
   lists the variants with their declared device and box; `--compact --depth 3`
   gives each variant's anatomy (box, offsets, layout, hug/fill sizing, radius,
   strokes, fills, text style, hidden layers). Confirm anatomy with the read-only
   `get_screenshot` / `get_design_context` when the numbers are not enough.
   List every component the node instantiates: each rendered dependency (an
   instance-swap default included) is a real dependency, aligned first or already
   `implemented`.
   **Done when** the variants, their states, the declared devices and the
   dependencies are written down.

2. **Place it.** Pick the family under `code.components` by what the component
   does; reuse existing components before writing new markup.
   **Done when** the module path and its imports are decided.

3. **Implement.** Build the source model, not a look-alike: `gap-*` for a vertical
   auto-layout (not child margins), hug/fill sizing from the spec, the source
   face and the token ladder for every value ([visual-parity.md](visual-parity.md)).
   A set with a device axis is built device by device ([devices.md](devices.md)).
   Never encode a source frame width as a dimension: the component stays fluid and
   the capture forces the root width.
   **Done when** the component renders every source variant and state through
   props shaped by [prop-conventions.md](prop-conventions.md).

4. **Story.** Under `code.stories`, one story export per source state the parity
   cases compare, framed at the exact source width
   (`max-w-full`, no invented wrapper width) and with `parameters.design` set to
   `figmaEmbedUrl("<nodeId>")`. Write or extend the guide in `code.guides` with
   the source mapping and import it into the docs description; add the
   consumer-facing rules in the guide's first block
   (`<!-- component-rules:start -->` … `<!-- component-rules:end -->`), under
   `## Component Rules` and without source references, and mark them
   ([rules.md](rules.md)).
   **Done when** the story renders in Storybook, the a11y suite passes and no
   rule that targets the node is `pending` or `stale`.

5. **Parity.** Order the work with
   `pnpm nx run pagopa-ui-cli:figma:parity:align --node <id>`, then the loop in
   [visual-parity.md](visual-parity.md) for every variant the stories expose and
   every declared device; save one case each.
   **Done when** each case reproduces with `pnpm nx run pagopa-ui-cli:figma:parity:check --case <id>`
   and every delta is fixed, a reasoned residue or a mapping artifact.

6. **Registry.** Write the entry for the node in `catalog.registry`: `target`
   (`module`, `export`, `story`, `storyExports`, `additionalExports` when the set
   has several implementations), a self-contained `note` for any constraint,
   open decision or recorded adaptation, then `status: "implemented"`. Export it
   publicly when it is a production component. Run `pnpm nx run pagopa-ui:figma:check`.
   An open point for the design owner is a design request
   ([design-request.md](design-request.md)); the node stays `pending` and the
   request is named in the note.
   **Done when** the node is `implemented` with a green device coverage line, or
   `pending` with its design request named.

7. **Close** with the source-alignment checklist in
   [definition-of-done.md](definition-of-done.md) and the closing steps of the
   skill.
