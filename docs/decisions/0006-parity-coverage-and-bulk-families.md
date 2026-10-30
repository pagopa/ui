# ADR-0006 — What parity coverage counts: the case population and the bulk families

- **Status:** Accepted — 2026-10-30.
- **Date:** 2026-10-30
- **Context:** a design review read the corpus as "87 of the 244 `implemented`
  nodes", a ratio that mixes two populations and makes a complete component
  surface look like a half-finished one. The corpus it read is the one
  [ADR-0004](./0004-device-axis.md) hardened: a work list for historical nodes and
  a gate for the delta. The numbers below come from `registry.json`,
  `inventory.json`, `parity-cases.json` and `device-policy.json` at this date, and
  from `pnpm nx run pagopa-ui-cli:figma:parity:queue --coverage`.
- **Related:** [ADR-0004](./0004-device-axis.md) (the device axis, the coverage
  vocabulary and the delta-scoped gate), [ADR-0003](./0003-artwork-provenance.md)
  (the provenance the bulk families carry), [ADR-0001](./0001-rework.md) (the
  review model the corpus serves).

## 1. Problem

Three counts live in the same files and are easy to confuse:

- **the corpus** — 302 cases over 90 nodes, all reviewed, none draft;
- **the single-case coverage** — 87 of the 244 `implemented` registry entries
  carry at least one case;
- **the device coverage** — 66 of 66 declared devices on the 29 `implemented`
  sets that declare an axis, plus 3 cases missing on two `pending` nodes
  (`1333:16408` Timeline drawer, `1344:40672` TableCellRow) that the gate does
  not count.

The 157 entries without a case are not scattered debt. They are **156 glyphs of
the `• Icon` page** and **one `• Spacing` node** (`237:1307`, whose story exists):

| Page         | `implemented` entries | with a case | without |
| ------------ | --------------------- | ----------- | ------- |
| `• Icon`     | 156                   | 0           | 156     |
| `• Spacing`  | 1                     | 0           | 1       |
| all the rest | 87                    | 87          | 0       |

The icon family is governed by a **bulk rule** (`registry.json` → `bulkRules` →
`• Icon`, status `implemented`): one rule for the whole page, carrying the names
export (`figmaIconNames`), the evidence module (`figma-inventory.ts`), the asset
manifest (`packages/artwork/src/assets/figma-icons/manifest.json`), the default
provenance and a `provenanceOverrides` map of the 12 glyphs that leave it. A
pictogram page is governed the same way (76 entries).

The glyphs keep entries of their own — all 156 are `implemented` — but every one
of them points at the same module (`PagoPAIcon.tsx`) and the same story export
(`Icons.stories.tsx#Catalogue`). `accountFor` in `registry.ts` resolves a node to
its entry first and falls back to the page's bulk rule, so a new published glyph
is accounted without anyone writing an entry for it. What the entries do not
carry, and cannot, is a per-node case: the entry names a _family_ target, not a
page of its own.

Two facts make a case per glyph both unaffordable and redundant:

- **The budget.** The reviewed bundle is capped at 10 MB
  (`MAX_EVIDENCE_BYTES`) and refuses a write that exceeds it — "Reduce the bundle
  to the main components; the cap is not raised". It measures 8.41 MB today —
  4.09 MB of pinned PNGs for the 302 cases and a 4.21 MB compressed slice, about
  29 KB per case — so the headroom is 1.59 MB, roughly 55 cases. The 156 glyphs
  would add ~4.6 MB and the write would be refused.
- **The capture.** A case maps one node to one story and one `root` selector. All
  156 glyphs render inside a single catalogue page with no per-glyph anchor, so
  no case can isolate one. Parity for a single glyph is not expensive today: it
  is not _expressible_.

What the icons have instead is stronger than a 2 px property comparison. An icon
is an SVG regenerated from the drawing, and `figma:assets:check` re-derives it,
requires it to reproduce its pinned geometry, and fails on a checksum or a
rendered-pixel mismatch; `figma:check` requires every `implemented` identity to
have a source asset mapping, a unique catalogue name and a provenance, and fails
on a stale or missing one. A 2 px property comparison on a 24×24 mask would add
ceremony to a proof that already runs at the byte level.

## 2. Decision space

**A — cover the 156 glyphs like any other node.** One reviewed case per glyph,
with a per-glyph selector added to the catalogue story.

- Pros: one rule for the whole surface, no vocabulary to explain.
- Cons: ~4.3 MB of evidence against ~0.9 MB of headroom, so the cap refuses it;
  it needs a story affordance and a new selector mechanism before the first case
  exists; and it verifies a glyph twice, the second time more weakly.

**B — declare the bulk families out of scope and say so in the metric.**
Coverage is reported against the population whose evidence is a parity case; the
icon and pictogram families are reported as bulk-covered, with their own proof.

- Pros: the number stops lying in both directions; no new mechanism; the
  evidence budget is untouched.
- Cons: a glyph drawn divergently can only be caught by the geometry check, not
  by a visual verdict; the metric gains a second population to explain.

**C — sample the family.** Keep the bulk rule and add reviewed cases for the
glyphs that are _not_ plain Material Symbols: the 7 brand marks and 5 custom
glyphs whose provenance overrides already single them out.

- Pros: the riskiest glyphs get a visual verdict, at ~12 cases and ~0.4 MB.
- Cons: still blocked on the per-glyph selector, and it re-introduces the
  question "which glyphs count?" every time the library grows.

## 3. Decision

**B, with C as a bounded follow-up.** The bulk families are admitted by the bulk
rule, and the coverage the repository reports says which population it counts.

### RD1 — the case coverage has a named denominator

A node **needs a case** when it is `implemented` and it sits on a page with no
`implemented` bulk rule — that is, when its evidence is not a family manifest and
a shared rendering. The denominator is therefore
`implemented entries − entries on a bulk-rule page`: `244 − 156 = 88`, of which
87 carry a case. `• Spacing` (`237:1307`) is the one real gap, and it is closed
by an ordinary case from its `Spacer.stories.tsx` story.

The reported line names the three populations instead of printing one ratio, and
the third one is what keeps the sum honest:

```text
figma parity coverage: cases 87/88 · bulk 232 (156 icons, 76 pictograms) · devices 66/66
```

- `cases` — reviewed cases over the nodes that need one;
- `bulk` — nodes admitted by a bulk rule, proven by their manifest and geometry
  check, and never counted as coverage debt;
- `devices` — the ADR-0004 device coverage over the `implemented` sets that
  declare an axis.

### RD2 — a bulk rule is evidence, not an exception

`device-exceptions.json` excuses a node that needs a case; a bulk rule is the
opposite: it is a _stronger_ evidence that replaces the case for a whole family,
and it must carry its own proof — a `namesExport`, an `assetManifest` and a
`provenance` per glyph (ADR-0003), verified hermetically by `figma:check` and
`figma:assets:check`. A family without those three is not bulk-admitted, and its
nodes stay in the case denominator.

### RD3 — the gate is unchanged

`figma:check` keeps failing a node in the delta that stays `implemented` without
a case per declared device. The bulk families declare no device axis, so RD1 in
ADR-0004 never applies to them, and this decision removes no gate: it removes a
misleading denominator.

### RD4 — the override glyphs are the named sample (follow-up)

The `provenanceOverrides` map of the `• Icon` rule lists exactly the glyphs that
stop being Material Symbols: 7 brand marks shipped as images (IO, SPID, CIE ID,
CIE, pagoPA, SEND, the social logos) and 5 custom PagoPA glyphs shipped as masks
(`first_letter`, `second_letter`, `third_letter`, `online_address`, `mail_pec`).
Those 12 are the sample that earns a case each — the rule's own note says they
"carry their own complete provenance override" — and the map is the definition,
so the sample cannot drift from what the repository believes. Their trigger is
the per-glyph selector:

- the catalogue story exposes one addressable root per glyph (a slot attribute
  per asset identity), so `root` can name a single glyph;
- the parity tool accepts it unchanged: a case per glyph is then an ordinary
  case, and the sample costs ~12 cases and ~0.35 MB of the 1.59 MB headroom.

Until the selector exists the 12 stay bulk-admitted, and this is recorded as
debt rather than as a silent assumption.

## 4. Consequences

- The component surface reads complete: `87/88` cases on the nodes that need one
  and `66/66` devices, instead of `87/244` on a denominator that counted a
  family the repository proves another way.
- The evidence budget stays at 8.41 MB of 10 MB. A future decision that wants a
  full glyph sweep must first change the cap policy or the bundle's shape, not
  quietly add 156 cases.
- The metric needs code to match this text: `figma:parity:queue --coverage` and
  the `Foundations/Figma inventory` story must read the registry's bulk rules and
  the asset manifests to compute the denominator, and print the three
  populations. Until that lands, the honest reading of the current output is the
  device line (`66/66` on `--status implemented`), and a single-case ratio must
  name the population it divides.
- A bulk family's fidelity rests on the geometry and manifest checks, not on a
  visual verdict: an icon drawn in Figma but shipped from a stale asset is caught
  by `figma:assets:check`, while an icon whose _composition_ is wrong for its
  usage is not caught at all — that remains a review responsibility, and it is
  the reason the override glyphs keep the sample above.
- `pending` nodes keep missing their cases without being debt: the 3 cases on
  `1333:16408` and `1344:40672` close when the nodes are implemented, through
  the ordinary cycle (`parity cases --sync`, `parity capture`, `parity check`,
  `parity evidence --write`).

## 5. Deferred decisions with triggers

| Deferred                                          | Trigger                                                                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| The 12 override glyphs get one case each (RD4)    | The catalogue story exposes a per-glyph root selector, so a case can name one glyph                                           |
| Any further glyph enters the sample               | A glyph's provenance override or rendering mode differs from the bulk provider's, and the geometry check cannot tell it apart |
| The bundle cap is revisited                       | A reviewed case that the surface needs is refused; the policy is then decided in the open, never by trimming the corpus       |
| The `bulk 232` figure joins the story as a filter | A reader needs the per-family breakdown rather than the total; the data already exists in the manifests                       |

## 6. Related

- [ADR-0004](./0004-device-axis.md) — the device axis, the coverage vocabulary
  (`declared`, `covered`, `missing`, drafts) and the delta-scoped gate RD3 keeps.
- [ADR-0003](./0003-artwork-provenance.md) — the provenance a bulk rule must
  carry for every glyph, and the overrides that name the RD4 sample.
- `packages/pagopa-ui/src/catalog/figma/coverage.ts` — the joins behind the
  printed numbers.
- `packages/ui-cli/src/parity/cases.ts` — `deviceCoverage`, and the R9 rule that
  no draft case counts.
