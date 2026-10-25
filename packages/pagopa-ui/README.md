# @pagopa/ui

PagoPA's React design system, published through GitHub Packages at
`https://npm.pkg.github.com` (not the npm registry). The first package release
is pending.

## Install

Configure the `@pagopa` scope in your `.npmrc` and authenticate with a GitHub
classic personal access token that has `read:packages`. Store the token in an
environment variable instead of committing it:

```ini
@pagopa:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

After a version is released, install the package alongside React and ReactDOM:

```sh
pnpm add @pagopa/ui
```

Import the stylesheet once and use the public component exports:

```tsx
import "@pagopa/ui/styles.css"
import { Button } from "@pagopa/ui"
```

React and ReactDOM are peer dependencies. The package ships compiled CSS,
fonts, artwork, and TypeScript declarations; consumers do not need Tailwind,
shadcn, or the repository's build aliases.
