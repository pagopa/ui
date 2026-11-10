# The page surface

The inventory is built from the published library export, and the export lists
only what the file owner published. A page draws more: helper components,
variant sets that were never published, and the compositions themselves — the
frame that stacks four rows at 852, the mobile page that draws them at 304, the
drawer panel at 320 or 417. None of them appears in the inventory, so nothing in
the procedure saw them. The page surface is the committed census that names them.

Read each touched page's complete tree through MCP `get_metadata` or REST, then
refresh identities:

```sh
pnpm ui-cli figma surface sync --page <pageId> --input <page-tree> --dry-run --json
pnpm ui-cli figma surface sync --page <pageId> --input <page-tree> --json
```

Use `--rest` instead of `--input` for a live read with a token. The input needs a
structured CANVAS tree, not an XML or text description: when MCP provides only
text, use REST or obtain a structured export. The writer reconciles identities
and publication, preserving existing decisions and compositions; inspect its
check verdict. Human review still accounts for every composition.

One record per page:

- **identities**, one row per component and set drawn on the page, each with
  `inLibrary` and the decision the library gives it — `shipped` (published and
  `implemented`), `mocked` (published and mapped, rendered by a facade),
  `excluded` (published, deliberately not shipped), `pending` (published and
  mapped, still waiting), `unpublished` (not in the export, so not implemented by
  rule). All but the first two carry a reason. A registry bulk rule is the
  decision for a node of its page that carries no entry of its own, the same
  fallback the inventory accounting uses. A drawing that was never published is
  recorded so its absence from the registry is a fact rather than an oversight,
  not so that it gets built: the day it is published the export grows, the
  mirror fails, and the decision becomes due.
- **compositions**, one row per frame the page draws with the implementation
  inside it: the `device` it is drawn at, how many times the implementation is
  `drawn`, and the parity cases that `mirror` it. A case mirrors a composition
  only if it measures that frame at that device; a composition with no case
  carries a `reason` saying what stays unmeasured and why.

`pnpm nx run pagopa-ui:check:catalogue` decides whether the census agrees with the
inventory and the registry, whether each composition's cases exist and measure it
at its declared device, and whether every published page is censused; an unread
page waits in `surfaceUncensused` with its published node count. The check cannot
discover unexported additions to a live page: re-read the tree each time the
session touches it. `pnpm ui-cli figma plan` adds `surfaceWaiting`,
`surfaceUnmirrored` and `surfaceUncensused` instead of hiding them behind the
delta.
