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

## Compatibility

- Scoped styles require CSS `@scope`: Chrome 118+, Safari 17.4+ or Firefox 128+.
  Older browsers render the components unstyled; there is no fallback.
- The application theme is **light only**. Dark pictogram variants are artwork,
  not dark application support.
- Default texts are Italian and overridable through component props or
  `UIProvider`. An English dictionary is also available.

## Documentation

The [package guide](./packages/pagopa-ui/README.md) covers router integration,
Next.js App Router, languages and text overrides, and the public token
exports. The [component guides](./apps/storybook/src/guides/) document
individual components and their usage.

## Contributing

For working on the design system itself, see
[CONTRIBUTING.md](./CONTRIBUTING.md): repository setup, architecture, agent
workflow, checks and releases.
