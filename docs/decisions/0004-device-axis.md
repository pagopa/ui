# ADR-0004 — The device axis: vocabulary, coverage and the delta-scoped gate

- **Status:** Accepted — 2026-10-15.
- **Date:** 2026-10-15
- **Context:** a 2026-10-15 hand-made mobile review found that the daily
  alignment flow compared the desktop variant only, while the inventory declares
  a device axis on 52 sets, and nothing in the repository required a mobile
  composition to exist. The responsive-alignment plan that followed (RA1–RA9) is
  delivered; its guardrails `R1`–`R9`, cited below, now live in the
  `figma-to-code` skill (`references/devices.md`, `references/parity-tooling.md`).
- **Related:** [ADR-0001](./0001-rework.md) (the review model the gate extends)
  and the parity hardening decision `D2` (the parity corpus is a work list, not a
  gate).

## 1. Problem

A published set that declares `Device`/`Breakpoint` draws one composition per
device. The catalogue was variant-blind (no per-variant record), the drift review
task had no device dimension, nothing required mobile evidence, and the parity
tooling resolved to the first variant — the desktop one. The result: "responsive"
was a value, not a requirement, and the mobile compositions were reviewed by hand
once, outside the framework.

## 2. Decisions

### RD1 — the delta-scoped gate (accepted)

The corpus stays a work list for historical nodes — hardening `D2` is not
re-opened — and becomes a **gate for new work**: a node in the delta of a live
comparison whose registry entry stays `implemented`, and any node an agent closes
as `implemented`, cannot do so without **one case per declared device** or a
**reasoned entry** in `src/catalog/figma/device-exceptions.json`.

- Enforced hermetically in `figma:check` from `inventory.json` +
  `registry.json` + `parity-cases.json`: the delta is what the run compares, so
  the rule needs no git history and no live payload.
- The weekly drift run (`--rest --pr-body`) queues the changed nodes as
  `pending`; the gate reads the final statuses, so the automation is never
  blocked — the drift pull request is where the work happens.
- Historical `implemented` entries warn (one aggregated line) and burn down from
  `pnpm figma:parity:queue --uncovered`, exactly like `evidence-exceptions.json`
  did. The exceptions file must shrink: an entry whose node no longer misses a
  device is an error, and a reason is mandatory.
- `figma:parity:cases --sync` proposes the missing per-device cases from a
  sibling case. A proposal is a **draft** (`note: "draft — refine the mapping"`):
  the coverage ignores it until the reviewed render replaces the note, so no
  unreviewed case can silence the queue (`R9`, no bulk approval).

### RD2 — the vocabulary is committed data (accepted)

`src/catalog/figma/device-policy.json` holds the vocabulary only: the axis names
that mean "device", the canonical devices with their aliases, the width to fall
back on when a variant carries none, the default layout scope, and the values
that mean "no device axis". It holds **no component name, file or module path**
(`R8`); what a set declares is read from the inventory, so adding or retiring a
component never edits the policy.

- A value the policy does not map is an **error** naming the value and the axis;
  a duplicated alias and an axis nobody uses are errors too; an alias with no
  current user only warns, because the vocabulary may stay ahead of the library.
- An axis is a device axis when the policy names it **or** when every value it
  declares resolves and at least one is a device. The source spells the axis
  `Device`, `Breakpoint`, `Layout` and even `Property 1`; the values, not the
  name, are the evidence. A device-like value on a non-device axis warns.

### RD3 — the case declares its device and its scope (accepted)

`src/parity/cases.ts` carries two optional fields: `device` (a canonical
device key, never a source alias) and `layoutScope` (`viewport` | `container`).
Existing cases keep their ids and verdicts; `caseIdFor()` appends `-<device>` and
`caseKey()` includes it, so two devices of one state are two reviewed cases. The
validator resolves the device through the policy and cross-checks it against the
variant the case points at.

### RD4 — device verification does not live in a story test (accepted)

The Storybook/Vitest project runs every story at one viewport, so a story cannot
express a device. Device verification lives in `figma:parity:check` (it sets the
Playwright viewport and forces the story root) and in the narrow-viewport
assertions of `library:check`. A story is documentation, never the gate.

### The two scopes, declared and verified

The axis says _what_ changes, not _how_ to switch. Each case declares one scope
(the policy's `defaultLayoutScope` applies when it declares none):

- **viewport** — the page width decides the composition (chrome bands, page
  states): the capture's viewport is the source device width.
- **container** — the space the component itself receives decides (modules,
  cards, panels): the capture sets the story root and the component's own box,
  the viewport stays wide.

The declaration is **verified, not trusted**: a `viewport` case must change when
only the viewport changes; a `container` case must change when only the root
width changes at a fixed viewport (the capture forces the element the case maps
as its root — an element width, never a component dimension, `R1`/`R4`). A
mismatch is a delta (`responsive.scope.*`): the mechanism that hid the gap — "a
narrow container is not a narrow viewport" — is now checked instead of trusted.

### The responsive verdict

`figma:parity:check` reports, per device: content hidden by an overflow
(`responsive.clipped`), paint outside the root box (`responsive.escaped`), text
lost to an ellipsis (`responsive.truncated`) and a band that wrapped or a stack
that collapsed (`responsive.band.wrap|stack`, derived from the variant's own
layout mode). They are **deltas** (`R6`): a case records a residue with its
reason when an adaptation is deliberate. A legitimate scroll container is an
advisory. The probe's allowlist (`.sr-only`, closed `<details>`,
`content-visibility`, `fixed` subtrees, own decorations that overlap their
positioning box) is what keeps it honest — an early sweep reported 48 problems,
two of them real.

### R8 — nothing enumerates components

No landed artifact — policy, check, skill, document — carries a hand-kept list of
component names, files or module paths for the device rules. The enumerations are
the inventory (what the source declares), the registry (what was decided) and the
case corpus (what was compared). Adding or retiring a component edits none of the
tooling.

## 3. Consequences

- `pnpm figma:check` prints the vocabulary line and the coverage line
  (`devices: <n> implemented sets · covered · missing · exceptions`), and the
  exceptions count sits next to the existing `exceptions:` line.
- The burn-down has three commands: `pnpm figma:parity:queue --uncovered` (the
  work list), `pnpm figma:parity:cases --sync [--node <id>] [--dry-run]` (the
  drafts) and `pnpm figma:parity:check --node <id> --devices` (the per-node
  loop).
- Nothing here re-opens hardening `D2` or the scope choice: a historical node
  stays a work list entry, and the scope is per case and verified.
- A device case cannot be a story: the fast loop stays at one viewport (`RD4`)
  and the device verdict lives where the viewport can be set.
