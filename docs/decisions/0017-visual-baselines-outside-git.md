# ADR-0017 — Visual baselines live outside git, keyed by the build

- **Status:** Superseded by
  [ADR-0018](./0018-chromatic-for-visual-regression.md) — 2026-11-27. Kept for
  the reasoning; the runner, the storage and the capture it decides are gone.
- **Date:** 2026-11-26
- **Context:** the visual regression compared 1551 PNG baselines committed under
  `apps/storybook/visual/__screenshots__`: 28 MB on disk against a 109 MiB pack,
  growing with every story, width and capture, and every checkout that wanted a
  shallow clone paid for the history of images it would never open. A second,
  opt-in Chromatic workflow compared the same stories against a service, so two
  runners could disagree about one rendering and neither was the whole answer.
  The widths, the scope walk and the Linux-only rendering (ADR-0004's device
  axis, the pinned Playwright container) were already settled: what was undecided
  was where the pixels live.
- **Related:** [ADR-0004](./0004-device-axis.md) (the widths the captures take),
  [ADR-0015](./0015-ephemeral-parity-diagnostic.md) (parity is a diagnostic;
  rendered regression belongs to visual regression, which is the runner this ADR
  makes the only one).

## 1. Problem

A committed baseline is a claim about one rendering: one story, one width, one
engine, one image. Keeping 1551 of them true cost a diff per capture, a
`visual:update` job that wrote them back to the head branch, a second job that
pushed them, a label to ask for it, a label to re-check it, and a preflight that
had to list what the tree was missing. Three defects followed from the shape:

- **The clone carried the past.** A baseline was never deleted, only replaced, so
  the pack kept every rendering the project had ever accepted. Shallow clones
  helped every other file and not the largest set in the repository.
- **The pull request carried the images.** A change that moved a component
  recaptured its stories and committed them, so the diff under review mixed a
  behaviour change with hundreds of binaries nobody reads in a diff.
- **Two runners, one question.** Chromatic captured the same stories at its own
  viewports and its own renderer, on a label, as a non-required check. A green
  gate and a green Chromatic run could disagree, and neither verdict told a
  reviewer which one the project believed.

## 2. Decision space

**A — keep the baselines in git and prune history.** Periodically rewrite the
baselines path out of the pack.

- Pros: no new storage, no fetch step, no token.
- Cons: a history rewrite on a shared repository, a force-push to `main`, and
  every fork invalidated. The 28 MB return is one-off and the growth resumes.

**B — move them to cloud storage (an object store) keyed by content.** Upload
each capture to a bucket, read it back by key.

- Pros: no repository at all, per-object lifecycle, cheap.
- Cons: new infrastructure, an approval to get it, a credential to rotate, a
  client library in the runner and an exit path if the account moves. The
  project's own CI already holds a token that reads repositories.

**C — a dedicated baselines repository, fetched shallow, keyed by the build.**

- Pros: no new infrastructure and no new credential — the run reads it with the
  `GITHUB_TOKEN` it already has; the storage keeps git's review and history on
  its own terms; the project's checkout stops carrying any image; one directory
  per key, so a stale set fails loudly instead of comparing two renderings.
- Cons: a second repository to hold permissions on, a fetch step before the
  suite, and a capture that only a Linux run can produce.

## 3. Decision

**C.** The baselines live in `pagopa/ui-visual-baselines`, under
`baselines/<key>/`, and `ui-cli test visual --fetch-baselines` is the only reader.
Chromatic, its workflow, its label, its addon and its documentation are deleted:
`ui-cli test:visual` (Playwright) is the single visual runner.

### RD1 — the key is what decides a rendering

`<manifest-hash>/<engine>/<image-digest>`: the SHA-256 of the built Storybook
index (`apps/storybook/dist/index.json`), the browser engine, and the digest of
the pinned Playwright image — the same inputs that decide which stories exist
and which renderer paints them. A key is a directory, never a manifest inside
one: the set is the directory's contents, so there is nothing to enumerate and
nothing to keep in step.

### RD2 — a missing or stale set fails, loudly

The preflight compares the key the build resolves with the key that was fetched,
and every scoped story with the images the set holds. A set fetched for another
key, an empty directory, a missing PNG: each exits nonzero naming the key, the
storage repository and, for an incomplete set, the files. Nothing is captured in
response — a comparison that would have to write its own baseline is not a
comparison — and `macOS` never captures one.

### RD3 — the fetch is shallow, sparse and outside the tree

`git clone --depth 1 --filter=blob:none --sparse` into `.nx/visual-baselines`,
then `sparse-checkout set baselines/<key>`; the runner copies that one
directory to `.nx/visual-baselines/snapshots` and removes the clone. No history
is fetched, no image enters this repository's `.git`, and a fresh clone of this
one never fetches a baseline at all. `VISUAL_SNAPSHOT_DIR` is the seam that
points Playwright at the copy.

### RD4 — no job writes a baseline into the checkout

The `visual-update` job, its push, the `visual:update` and `visual:check` labels
and the `labeled` trigger are gone. A baseline changes in the storage repository,
through a pull request there, captured on the pinned image. The visual job only
ever reads: `contents: read` for the checkout and the baselines clone, and
`packages: read` for the registry install.

### RD5 — one runner owns the visual diff

Playwright keeps the comparison: `threshold: 0` with a 32-pixel budget, the
scope walk, the three widths, the `no-visual` tag. Chromatic's per-story
`parameters.chromatic` — the viewports and `disableSnapshot` overrides — go with
it, since the suite captures every story at the system's widths and skips by tag.

## 4. Consequences

- The repository stops growing by image: 1551 PNGs and 28 MB leave the tree and
  the pack, and the next capture adds nothing to either.
- A checkout is shallow for the reason it was shallow before; the baselines are
  not in the history to fetch.
- Capturing a baseline is a Linux run on the pinned image plus a pull request on
  the storage repository. That is one more repository to open and one fewer
  binary in a code review.
- A pull request no longer repairs its own baselines: a change that moves pixels
  fails the gate and points at the key storage needs. Merging the set is a
  separate, reviewed act on the storage repository.
- Chromatic's dashboard, its per-story viewport overrides and its history go
  away. Nothing replaces the dashboard: the failure artifact is the Playwright
  diff, uploaded by the run.
- The storage repository must stay readable by this repository's `GITHUB_TOKEN`,
  which means public. A private storage repository would need a token of its own
  and a documented exception to RD3.

## 5. Deferred decisions with triggers

| Deferred                                          | Trigger                                                                                                                                |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Pruning old keys from the storage repository      | The clone's size or the fetch's duration becomes the slowest part of the run; a key nobody has asked for in months is the unit to drop |
| A baseline for a second engine                    | A regression proves invisible on Chromium and the nightly must gate it; the key already carries the engine axis                        |
| A private baselines repository with its own token | The baselines must stop being public, which turns the read into a credential with a rotation policy                                    |

## 6. Related

- `packages/ui-cli/src/testing/visual-baselines.ts` — the key, the fetch and the
  record of what was fetched.
- `packages/ui-cli/src/testing/visual.ts` — the scope walk and the preflight that
  refuses a missing or stale set.
- `packages/ui-cli/tests/testing/visual-baselines.test.mjs`,
  `packages/ui-cli/tests/testing/visual-scope.test.mjs` — the key format, the
  shallow fetch, and the failure a missing set produces.
- `packages/ui-cli/tests/workflows/visual-baselines.test.mjs` — the wiring: a
  checkout with no image, a fetch before the preflight, no job that writes one.
- `.github/workflows/visual.yml` — the run this ADR decides.
