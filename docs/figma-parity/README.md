# Figma parity evidence

The committed evidence bundle lets a clone read the source side of every reviewed
parity case and look at the pinned Figma image, without the local 160 MB snapshot
and without `FIGMA_TOKEN`.

It is **generated, never hand-edited**:

| File                     | Content                                                                 |
| ------------------------ | ----------------------------------------------------------------------- |
| `source.json`            | the compact document map a case points at (its node and variants)       |
| `references/<caseId>.png`| the pinned Figma render of the case variant, scale 1, at the pinned version |
| `manifest.json`          | the file key, the version, the per-case hash, variant and fingerprint   |

The PNGs are review evidence, not a pixel gate: the verdict stays the 2 px
property comparison of `parity check`. The whole bundle is capped at **10 MB**;
a bundle that would exceed it is refused and reduced to the main components — the
cap is never raised.

## Refresh

```sh
export FIGMA_TOKEN=...    # file_content:read and library_content:read
pnpm nx run pagopa-ui-cli:figma:parity:evidence -- --write
```

`--write` reads `.figma/live-rest.json` (or `--input <file>`), writes the slice
and the manifest, exports a PNG for every case variant, skips a case whose
fingerprint and hash are unchanged, and removes the entry and the file of a case
that left the corpus.

## Check

```sh
pnpm nx run pagopa-ui-cli:figma:parity:evidence -- --check
```

`--check` is hermetic: it fails on a case without a manifest entry, an orphan
entry or PNG, a missing file, a hash mismatch, a case node missing from the
slice, or a manifest version that differs from the slice. `parity verify` runs
the same check next to the corpus and the device coverage.
