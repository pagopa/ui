# Figma parity evidence

The committed evidence bundle lets a clone read the source side of every reviewed
parity case and look at the pinned Figma image, without the local 160 MB snapshot
and without `FIGMA_TOKEN`.

It is **generated, never hand-edited**:

| File                      | Content                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------- |
| `source.json.br`          | the complete document map a case points at, minified and Brotli-compressed              |
| `references/<caseId>.png` | the pinned Figma render of the case variant, scale 1, at the pinned version             |
| `manifest.json`           | schema version 2: file key, version, source hash, and per-case hash, variant and fingerprint |

The PNGs are review evidence, not a pixel gate: the verdict stays the 2 px
property comparison of `parity check`. The whole bundle is capped at **10 MiB**;
the cap counts the bytes a clone receives, so the slice is measured compressed.
A bundle that would exceed it is refused: retain every required case and reduce
the bundle. The cap is not raised by editing a number here — it moves only
through an amendment to [ADR-0006](../decisions/0006-parity-coverage-and-bulk-families.md)
that the reviewer approves.

The slice uses lossless Brotli compression without a timestamp: the same corpus
and snapshot produce the same bytes with the pinned toolchain. The tool reads
`source.json.br` directly, and accepts older gzipped slices as explicit inputs.
The source hash covers the uncompressed JSON: an explicit slice must match that
content even when its compression format differs.

## Refresh

```sh
export FIGMA_TOKEN=...    # file_content:read and library_content:read
pnpm nx run pagopa-ui-cli:figma:parity:evidence --write
```

`--write` reads `.figma/live-rest.json` (or `--input <file>`), writes the slice
and the manifest, exports a PNG for every case variant, skips a case whose
fingerprint and hash are unchanged, and removes the entry and the file of a case
that left the corpus.

## Check

```sh
pnpm nx run pagopa-ui-cli:figma:parity:evidence --check
```

`--check` is hermetic: it fails on a case without a manifest entry, an orphan
entry or PNG, a missing file, a source or PNG hash mismatch, a case node missing
from the slice, or a manifest version that differs from the slice. `parity
verify` runs the same check next to the corpus and the device coverage.

## Staleness

The bundle is a photograph of the reviewed source, not a live mirror: it is as
fresh as the committed inventory, never fresher. `parity verify` and
`parity check --case <id>` compare the manifest's version and design fingerprint
with the committed inventory; when the inventory moved and the bundle did not,
the run stops with exit 2 and asks for a refresh. Reproducing an old reviewed
case on purpose means checking out the old commit, not bypassing the check.
