# Component without a Figma node — catalogue coverage

Scope: a component that has no node in `catalog.inventory`. How it is written
is outside this skill; this use case keeps the catalogue consistent with it.

1. **Coverage.** A private module needs nothing here. A module exported from
   `code.publicEntry` needs a mapping for the reverse coverage of
   `figma:check`: a `modulePatterns` rule for a whole subtree, or a
   `catalog.apiExceptions` entry with its reason ("deliberate extension, not a
   source-alignment claim"; the existing entries are the model).
   **Done when** `pnpm nx run pagopa-ui:figma:check` accepts the export surface.

2. **Later coverage.** A component that a published set later covers enters
   through [delta.md](delta.md).

3. **Close** with the closing steps of the skill.
