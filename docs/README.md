# Documentation

The documentation tree of the workspace. Every document under `docs/` is
reachable from this page: the sections below are the entry points, and each one
holds the documents that belong to it.

The vocabulary shared with the rest of the repository is in the [glossary
map](../GLOSSARY.md), which separates the Figma-alignment terms from the
consumer design-system ones. How the repository is laid out, built, verified and
released is in [CONTRIBUTING.md](../CONTRIBUTING.md); the consumer-facing
documentation of a component is its [guide](../apps/storybook/src/guides/), not
a page of this tree.

| Section                                         | Holds                                                                                  | Start here                                                                                |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [Decisions](./decisions/)                       | The architecture decision records, each with its context, decision and consequences    | [ADR-0001](./decisions/0001-rework.md)                                                    |
| [Design defaults](./design-defaults.md)         | The ratified system-level defaults an alignment applies before it asks a question      | [design-defaults.md](./design-defaults.md)                                                |
| [Design requests](./design-requests/)           | The questions opened to the design owner and the answers recorded against them         | [2026-10-16 — foundation variables](./design-requests/2026-10-16-foundation-variables.md) |
| [Use cases](./use-cases/)                       | One page per use case, `UC-01` to `UC-12`, with actors, flows and acceptance checks    | [Design review](./design-review.md)                                                       |
| [Design review](./design-review.md)             | The DR/SRS of the design system: outcome, solution design, requirements and open items | [Design review](./design-review.md)                                                       |
| [Figma drift handoff](./figma-drift-handoff.md) | The runbook of the weekly drift pull request and the work order it carries             | [figma-drift-handoff.md](./figma-drift-handoff.md)                                        |
| [Figma drift secrets](./figma-drift-secrets.md) | The delivery tokens, where they live and how they are rotated                          | [figma-drift-secrets.md](./figma-drift-secrets.md)                                        |

## Decisions

The ADRs are numbered and immutable once accepted; a later decision supersedes
one rather than editing it.

| Record                                                            | Decision                                                                    |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [ADR-0001](./decisions/0001-rework.md)                            | Rework: alignment review model and the visual-diff evolution                |
| [ADR-0002](./decisions/0002-deferred-decisions.md)                | Deferred decisions with triggers                                            |
| [ADR-0003](./decisions/0003-artwork-provenance.md)                | Artwork provenance: source, licence and theming of icons and pictograms     |
| [ADR-0004](./decisions/0004-device-axis.md)                       | The device axis: vocabulary, coverage and the delta-scoped gate             |
| [ADR-0005](./decisions/0005-nx-monorepo.md)                       | The Nx monorepo: layout, validation and release                             |
| [ADR-0006](./decisions/0006-parity-coverage-and-bulk-families.md) | What parity coverage counts: the case population and the bulk families      |
| [ADR-0007](./decisions/0007-committed-records-reader.md)          | The committed records are read through one reader, and it never writes      |
| [ADR-0008](./decisions/0008-case-corpus-value.md)                 | The case corpus is one value (superseded: the corpus is gone)               |
| [ADR-0009](./decisions/0009-ratified-design-defaults.md)          | The system-level design defaults: ratified once, applied by every alignment |
| [ADR-0010](./decisions/0010-single-typescript-compiler.md)        | One stable TypeScript compiler for the whole workspace                      |
| [ADR-0011](./decisions/0011-css-cascade-layers.md)                | The stylesheet encapsulates with cascade layers, not `@scope`               |
| [ADR-0012](./decisions/0012-inline-svg-artwork.md)                | Icons are inline SVG components, and an unknown name renders nothing        |
| [ADR-0013](./decisions/0013-semantic-token-contract.md)           | The public token contract is semantic: `--pui-*`, named for the role        |
| [ADR-0015](./decisions/0014-utility-prefix.md)                    | Utilities ship under an internal prefix, in both spellings                  |
| [ADR-0015](./decisions/0015-ephemeral-parity-diagnostic.md)       | Numerical parity is an ephemeral diagnostic, not a committed corpus         |

## Use cases

The catalogue is the one of the [design review](./design-review.md); the pages
live one per file under [use-cases](./use-cases/). The Figma-alignment
procedure the implementation use cases follow is the
[figma-to-code](../.agents/skills/figma-to-code/SKILL.md) skill, and the
component standards they follow are the
[pagopa-ui-standards](../.agents/skills/pagopa-ui-standards/SKILL.md) skill.

## Outside this tree

- [README.md](../README.md) — what the package is and how to install it.
- [CONTRIBUTING.md](../CONTRIBUTING.md) — setup, architecture, checks, releases.
- [AGENTS.md](../AGENTS.md) — the rules a coding agent follows.
- [Component guides](../apps/storybook/src/guides/) — the consumer documentation
  served by the catalogue.
