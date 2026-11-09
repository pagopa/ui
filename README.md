# PagoPA UI

> **EXPERIMENTAL — NOT PRODUCTION-READY.** This project validates whether AI
> agents can build and evolve a design system from Figma under human direction.
> Its APIs and behaviour may change as that hypothesis is tested.

React design system implementing the **MUI Italia Next** Figma library.
`@pagopa/ui` provides typed components, design tokens, icons and pictograms,
with a compiled stylesheet and bundled text fonts.

## Install

The first package release is pending. Once released, `@pagopa/ui` will be
available through **GitHub Packages**, not npmjs.

Configure the `@pagopa` scope in your application's `.npmrc` and authenticate
with a GitHub classic personal access token with `read:packages`. Keep the token
in the `NODE_AUTH_TOKEN` environment variable, not in a committed file:

```ini
@pagopa:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Install the package alongside React and ReactDOM in the supported peer range
(`^19.2.0`):

```bash
pnpm add @pagopa/ui
```

## Quick start

Import the stylesheet once and wrap your component tree in `UIProvider`:

```tsx
import "@pagopa/ui/styles.css"
import { Button, UIProvider } from "@pagopa/ui"

export function App() {
  return (
    <UIProvider>
      <Button>Continua</Button>
    </UIProvider>
  )
}
```

`UIProvider` supplies the scope root required by the stylesheet. Components
outside it are unstyled.

Consumers need no Tailwind, shadcn, repository aliases or separate font
packages. The artifact includes compiled CSS, text fonts with their licence,
standalone icon and pictogram SVGs, and TypeScript declarations supporting
Bundler and NodeNext resolution.

## Design handoff for an agent

The package ships the `figma-to-ui` skill, the `pagopa-ui-map` command and the
`figma-map.json` both read, so an agent that receives a Figma layout can find the
component that draws each part without reading the design system's internals.
Installing `@pagopa/ui` installs all three, under the installed package:

```text
node_modules/@pagopa/ui/skills/figma-to-ui/SKILL.md   # the procedure
node_modules/@pagopa/ui/cli/pagopa-ui-map.mjs         # one lookup per node
node_modules/@pagopa/ui/figma-map.json                # the node-to-component map
node_modules/@pagopa/ui/plugin.json                   # the Agent Plugin manifest
```

Point the agent at the skill and at the layout:

> Use the `figma-to-ui` skill in `node_modules/@pagopa/ui/skills` to build this
> layout with `@pagopa/ui`: `<Figma link>`

An agent that reads its skills from a folder of its own takes a copy: copy
`skills/figma-to-ui` into `.claude/skills`, `.github/skills` or the equivalent
the agent scans. Tools that read the Agent Plugin manifest find `plugin.json` in
the package, with the skill beside it, and need no other configuration.

The `pagopa-ui-map` binary lands in `node_modules/.bin`, so `pnpm exec
pagopa-ui-map resolve 194:3654` answers outside the skill too. Node 22.18 or
later runs it.

## Compatibility

- Scoped styles require CSS `@scope`: Chrome 118+, Safari 17.4+ or Firefox 128+.
  Older browsers render the components unstyled; there is no fallback.
- The application theme is **light only**. Dark pictogram variants are artwork,
  not dark application support.
- Default texts are Italian and overridable through component props or
  `UIProvider`. An English dictionary is also available.

## Documentation

The [package guide](./packages/pagopa-ui/README.md) covers router integration,
Next.js App Router, languages and text overrides, the public token exports, and
the Figma handoff in full. The [component
guides](./apps/storybook/src/guides/) document individual components and their
usage.

## Contributing

For working on the design system itself, see
[CONTRIBUTING.md](./CONTRIBUTING.md): repository setup, architecture, agent
workflow, checks and releases.
