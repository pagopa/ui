# Visual regression harness

`visual.spec.ts` captures every story of the built Storybook at the three
widths of the design system's breakpoints, and compares each capture with the
baselines committed in `__screenshots__`. `playwright.config.ts` holds the
comparison: `threshold: 0`, so every counted pixel matches exactly, and a
32-pixel budget that absorbs Chromium's rasterisation noise without hiding a
surface or a layout change.

Baselines are Linux images produced by the workflow itself, never by a local
run on another platform: `serve.mjs` serves the built storybook the suite
visits, and only the pinned Playwright container reproduces the rendering the
committed images were taken on.

A run is either the whole catalogue or the scope `ui-cli test visual` wrote to
`scope.json` and named through `VISUAL_SCOPE`: the stories a pull request's
diff can move. Without that file the suite is complete. The scope file is an
input, not a baseline, and so is every image under `__screenshots__`: committing
baselines never widens the scope of the change that produced them.

The two labels that drive a capture, its scope, and how a rejected baseline is
repaired are in the visual regression section of the workspace
`CONTRIBUTING.md`.
