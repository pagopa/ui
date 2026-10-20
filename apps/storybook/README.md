# Storybook

The deployable documentation of the design system: the stories, the guides and
the Figma alignment surfaces, built into one static site.

```bash
pnpm nx run storybook:build     # writes apps/storybook/dist
```

The stories live here, next to the Storybook configuration that renders them;
they import the design system through the `@/` alias (`packages/pagopa-ui/src`)
and the generated data through its packages. `figma:check` follows those imports
to prove that every story renders the exact export of its registry target.

The deployment is **Azure Static Web App** (decided 2026-10-19): the
infrastructure project and the DX release workflow for a static application are
the implementation that follows. Until then the target is what proves the documentation still
builds, on every pull request that touches the package.
