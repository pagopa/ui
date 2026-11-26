# Visual regression harness

`visual.spec.ts` captures every story of the built Storybook at the three
widths of the design system's breakpoints, and compares each capture with the
Linux baselines stored outside this repository, in `pagopa/ui-visual-baselines`.
`playwright.config.ts` holds the comparison: `threshold: 0`, so every counted
pixel matches exactly, and a 32-pixel budget that absorbs Chromium's
rasterisation noise without hiding a surface or a layout change. It reads the
baselines from `VISUAL_SNAPSHOT_DIR`, which defaults to `__screenshots__`: no
image under it is tracked, and a run without a fetched set refuses instead of
capturing one.

`ui-cli test visual --fetch-baselines` is what puts a set there: a shallow sparse
clone of the storage repository, read for the one directory the run's key names —
the built index's hash, the engine and the pinned Playwright image digest. The
set lives under `baselines/<manifest-hash>/<engine>/<image-digest>/` there, and a
key storage has no set for fails the run with the key named. `serve.mjs` serves
the built storybook the suite visits; only the pinned Playwright container
reproduces the rendering the stored images were taken on.

A run is either the whole catalogue or the scope `ui-cli test visual` wrote to
`scope.json` and named through `VISUAL_SCOPE`: the stories a pull request's
diff can move. Without that file the suite is complete. The scope file is an
input, not a baseline, and so is every fetched image: a capture never widens the
scope of the change that produced it.

How a capture is scoped, how a rejected baseline is repaired in the storage
repository, and the pinned image are in the visual regression section of the
workspace `CONTRIBUTING.md`.
