# ADR-0013 — The public token contract is semantic: `--pui-*`, named for the role

- **Status:** Accepted — 2026-11-26.
- **Date:** 2026-11-26
- **Context:** the published token contract was the Figma Variables verbatim. A
  host page read `--figma-color-blue-500` or `--figma-spacing-24`, names the
  Figma library owns: a rename or a move in a collection — a routine design
  operation — changed the public contract of the package without a library
  change, and every host stylesheet reading the old name broke. The same layer
  also served two audiences at once: the components, which want the role
  (`primary`, `error-soft`, `page-gutter`), and the Figma collections, which
  hold palette steps and scale entries.
- **Related:** [ADR-0005](./0005-nx-monorepo.md) (the workspace and its gates),
  [ADR-0009](./0009-ratified-design-defaults.md) (the role/value table an
  alignment cites), [ADR-0002](./0002-deferred-decisions.md) (the deferred
  decisions this resolves the trigger of).

## 1. Problem

`packages/tokens/src/tokens.generated.css` emitted one `:root` block whose custom
properties were named after the Figma variables, and
`packages/pagopa-ui/etc/tokens.txt` — the committed gate contract — recorded
those names as the public surface. Nothing separated _what a host may style
against_ from _where the value came from_.

Two consequences followed. First, the guarantee the package cannot keep: an
upstream rename is invisible in review of this repository (the generator
regenerates the name), so no gate catches it, and the breaking change reaches
consumers as a silent no-op value. Second, the semantic aliases the components
already use — `--primary`, `--error-soft`, `--page-gutter` — existed only as
library-local declarations inside `packages/pagopa-ui/src/index.css`: they were
the reviewed naming of the roles, but they were neither published nor gated.

## 2. Decision space

**A — keep `--figma-*` public and document "do not rename".** Leave the
contract as it is and record the stability expectation in the guide.

- Pros: no change, no migration, nothing to publish.
- Cons: the expectation lives in prose, the gate cannot enforce it, and a
  designer renaming a collection is not a violation of anything — the guarantee
  would be a courtesy, not a contract.

**B — generate `--pui-*` from a committed role map.** Add
`packages/tokens/src/semantic.json`, one entry per role naming its CSS name and
its Figma variable, and generate the contract from it.

- Pros: the mapping is explicit and reviewable in one file.
- Cons: it is a second source of truth beside the stylesheet block that already
  carries the role names and their values, so a new role is three edits — the
  map, the block, and the components — and the map drifts the moment one is
  missed. It also invites the map to name a Figma variable the block never
  reads, which the generator would have to police anyway.

**C — derive the contract from the reviewed semantic block.** `index.css`
already declares the semantic layer: each `--pui-*` property names a role and
resolves to the primitive behind it. Make that block the naming authority, and
have the generator read it — at check time and at write time — to emit the
contract.

- Pros: one source of truth, reviewed as a stylesheet by the person changing a
  component; the role name and its primitive cannot disagree because they are
  one declaration.
- Cons: the stylesheet is the input to a generator that also validates it, so
  the round trip has to be stated and gated (see RD1 and RD4).

## 3. Decision

**C.** The `.pagopa-ui-root` block of `packages/pagopa-ui/src/index.css` is the
public token contract. Every declaration there is a `--pui-*` role, and its
value is the primitive it resolves to. `packages/ui-cli/src/figma/tokens.ts`
reads that block and emits one contract in three projections:

- `packages/tokens/src/tokens.generated.css` — `@pagopa/ui/tokens.css`: the
  `--pui-*` roles on `:root` with their resolved values, and nothing else. The
  contract stands alone: the primitive layer is not emitted, because the values
  reach the file already resolved.
- `packages/tokens/src/pui-tokens.generated.ts` — the same list as typed data
  (`semanticTokens`, `SemanticToken`, `SemanticTokenType`), re-exported by
  `@pagopa/ui/tokens`.
- `packages/tokens/src/tokens.dtcg.generated.json` — the same contract in Design
  Tokens Community Group format, published as `@pagopa/ui/tokens.dtcg.json`:
  the `pui` group carries `$type` and `$value`, and its values are `{alias}`
  references into a `primitives` group that holds only the entries the contract
  actually references.

### RD1 — the stylesheet is the naming authority

The role name is written by hand, in the stylesheet, in review; the value is
resolved by the generator. A rename in Figma therefore moves `--figma-*` and
nothing behind it: the block keeps `--pui-primary: var(--figma-color-blue-500)`
only until the primitives are refreshed, and the emitted value is what the
block resolves to. `packages/ui-cli/tests/figma/tokens.test.mjs` holds the
fixture that proves it: renaming the Figma variable changes no `--pui-*` name
and no `--pui-*` value.

The type of a role is derived, not declared: a colour primitive makes a `color`,
an effect makes a `shadow`, anything else a `dimension`; a role that only
carries a `var()` takes the type of its target. A new DTCG type is a change to
`DTCG_TYPES` in the generator, not a field in the stylesheet.

### RD2 — `--figma-*` is build-time only, internal and never published

The primitive layer keeps its Figma names, because that is what makes the
regeneration mechanical, and it stays in the repository, because the contract is
generated from it and re-running the generator needs the names. It is no longer
part of any published artifact: the library build resolves every
`var(--figma-*)` in the stylesheet to the literal it names and drops the
declarations, so `@pagopa/ui/styles.css` and `@pagopa/ui/tokens.css` carry the
`--pui-*`, Tailwind theme and typography namespaces only. The plugin is
`packages/pagopa-ui/build/resolved-primitives.ts`; a primitive that is
referenced and never declared, or a cycle between primitives, fails the build.

The layer is documented as internal and build-time in the tokens guide, the
package README and this record, `packages/ui-cli/src/checks/foundation.ts` fails
a component that references one (`raw-figma-variable`), and the artifact check
fails a shipped stylesheet carrying a `--figma-*` name.

This retires the layer the §5 trigger deferred.

### RD3 — one read, three projections, no second source

Nothing downstream of the stylesheet is hand-edited. A role added to the block
reaches the stylesheet, the typed module, the DTCG file and the committed gate
contract in one `ui-cli update tokens` run; a divergence between the block and
any projection fails `ui-cli check tokens`.

### RD4 — the gates bound the contract in both directions

- A declaration inside the block that is not a `--pui-*` name fails the token
  refresh: a role cannot enter the contract unaudited (`--pui-* only`).
- A `var(--pui-*)` the block does not declare fails the token refresh: the
  stylesheet cannot reference a role the contract does not carry.
- `packages/pagopa-ui/etc/tokens.txt` records the published surface, the
  `--pui-*` names as CSS names and as typed names; the public-token check fails
  on a removal or a rename as a breaking change.
- The foundation gate reads the emitted contract back (`emittedTokenNames`) so
  the names a component may reference are the published ones, not a second
  derivation.

## 4. Consequences

- A Figma rename changes no `--pui-*` name and no `--pui-*` value: the contract
  survives the operation that used to break it. The guarantee is a fixture and a
  gate, not a paragraph.
- Consumers gain a vendor-neutral file: `@pagopa/ui/tokens.dtcg.json` is the
  same contract in a format Style Dictionary and similar tools read, with no
  Figma vocabulary in it.
- This is a breaking change of the published contract — every `--figma-*` name
  a host reads leaves the stylesheet. It ships without a migration guide and
  without a codemod: the package has no installed consumers yet, and the first
  release after this record is the first one to carry the contract.
- The block grows by hand as the first place a new role appears. That is the
  cost of one source of truth, and it is paid where the change is reviewed
  anyway.
- `etc/tokens.txt` records the 88 semantic roles alone, `js:` entries included:
  the primitives left the surface when the build began resolving them.
- The stylesheet a consumer downloads shrank by the primitive block, and the
  names it can read are the ones the contract names.

## 5. Deferred decisions with triggers

| Deferred                                 | Trigger                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Publish the contract as a themed surface | A second theme is ratified; today the contract is one light theme, and dark mode would make `--pui-*` the theme's output |
| Give the DTCG file a version field       | A consumer reads the file and needs to tell one projection from the next without diffing it                              |

The `--figma-*` removal this section used to defer has been made: the trigger
("a tool in the repository reads the primitives at build time") fired, and RD2
records the build-time resolution that replaced the published layer.
