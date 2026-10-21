# Foundation tokens

**Done when** every token the change touches lives in the manifest the config
names, the generated layer and the stylesheet match it, the component class
contract is green, and every exception carries a node and a reason.

## The manifest refresh

1. Read `figma-to-code.yaml` and use the paths it names.
2. Export the published assets read-only and save the snapshot where the config
   expects it. The snapshot may carry an `ids` map: for every variable and text
   or effect style, its published key next to the value. Prefer an id-bearing
   export: the manifest is keyed by the published id, so a rename stays a delta
   instead of a remove-and-add.
3. Curate and regenerate with the token write command in the scripts
   reference. Unknown namespaces fail, every removal and every rename is
   printed.
4. Keep the checks green: `pnpm nx run pagopa-ui-tokens:tokens:check`, `pnpm nx run pagopa-ui-cli:test`,
   `pnpm nx run pagopa-ui:foundation:check`.

## The ladder for a value

- Use the existing foundation token.
- No token within tolerance: add the entry the manifest owns. A value that
  recurs in the source geometry becomes a foundation entry with the node or
  page it comes from and, when no published asset carries it, the reason that
  marks it a local extension.
- A value that belongs to one component or page only stays a local extension in
  the stylesheet the config names.
- A value that has no source and no clear owner is a registered exception with
  the node and the reason, and it enters a design request
  ([design-request.md](design-request.md)). It is never absorbed silently.

## The component class contract

The check over the component sources refuses arbitrary px/rem values, default
Tailwind text sizes, standalone weight classes, raw variables, palette or hex
colours and off-scale spacing. The generated type classes carry size, line
height and the source weight — the source weight 500 is the CSS 600, and 600 is
700 — so a text token never needs a weight class next to it. The baseline the
check compares against can only go down: removing values lowers it in the same
change; a stale exception fails.
