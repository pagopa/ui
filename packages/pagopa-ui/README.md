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

Import the stylesheet once and wrap the component tree in `UIProvider`:

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

The provider renders the scope root the stylesheet is written against; a
component tree outside it is unstyled. Scoped styles require `@scope` support:
Chrome 118+, Safari 17.4+ or Firefox 128+. There is no fallback, so older
browsers render the components unstyled.

React and ReactDOM are peer dependencies. The package ships compiled CSS,
fonts, artwork, and TypeScript declarations; consumers do not need Tailwind,
shadcn, or the repository's build aliases.

## Tokens

The `--figma-*` custom properties in `styles.css` are the public token
contract: a section that renders beside the components reads the same colours,
spacing, radius and shadows. `@pagopa/ui/tokens` exports them as typed data,
and `@pagopa/ui/tokens.css` ships the block alone for a page that does not load
the component stylesheet. The values are read-only; a rename is a breaking
change listed in the changelog. See the
[tokens guide](../../apps/storybook/src/guides/tokens.md) for the loading
options and the two examples.

## Router links

Every navigation link renders as a plain `<a>` unless a provider supplies the
application's link component. With Next.js, define the adapter in a Client
Component: the provider value contains functions and cannot cross the
Server/Client boundary.

```tsx
// app/providers.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { UIProvider, type LinkComponentProps } from "@pagopa/ui"

const RouterLink = React.forwardRef<HTMLAnchorElement, LinkComponentProps>(function RouterLink(
  { href, ...props },
  ref,
) {
  return <Link {...props} href={href} ref={ref} />
})

export function Providers({ children }: { children: React.ReactNode }) {
  return <UIProvider linkComponent={RouterLink}>{children}</UIProvider>
}
```

The component receives `href`, the anchor attributes and a `ref`; keep it
forwarding all of them so client-side routing, open-in-new-tab and which-link
focus survive. In-page `#id` links stay plain anchors.

## Next.js (App Router)

The package ships one ES module per component, and each module that runs in the
browser carries its own `"use client"`. A Server Component imports the
components it needs directly and pulls no wrapper module of its own; a page
loads only the modules it imports, not the whole library. Import the stylesheet
once in the root layout and render the provider inside `<body>`, so every page
keeps the link component and the texts:

```tsx
// app/layout.tsx
import "@pagopa/ui/styles.css"
import type { ReactNode } from "react"
import { Providers } from "./providers"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

Keep `locale` and `messages` in the same Client Component as `linkComponent`;
a dictionary can contain functions, such as the pagination labels.

## Languages and texts

The default dictionary is Italian. A text prop wins over the provider, and the
provider wins over the default dictionary. Switch a whole tree to English:

```tsx
import { UIProvider, enMessages } from "@pagopa/ui"

;<UIProvider locale="en-US" messages={enMessages}>
  {children}
</UIProvider>
```

`locale` is the BCP 47 code the components format with; `calendarLocale` takes
a react-day-picker locale. Override a single label, leaving the rest Italian:

```tsx
<UIProvider messages={{ pagination: { previousLabel: "Indietro" } }}>
```

A nested provider merges over the enclosing one. `itMessages` and `enMessages`
are exported whole; `Messages` types a complete dictionary.

## Figma handoff

`figma-map.json` ships with the package and answers which exports render a Figma
node. The `pagopa-ui-map` command that ships beside it reads one row at a time,
offline, so a forty-part layout costs forty lookups instead of a read of the
whole map:

```sh
pagopa-ui-map resolve 194:3654   # the exports that render this node, and its status
pagopa-ui-map search alert       # nodes by name, export, story id or node id
pagopa-ui-map export Switch      # the nodes one export renders
```

Every command accepts `--json`. Node 22.18 or later runs them.

The ids are the library's: the map indexes the component file, so `resolve` wants
the component an instance comes from, not the instance. A link to another Figma
file is refused for that reason — its ids belong to that file. A row whose `also`
line names a component without an import (`Checkbox`, a template) is drawn by
something the package keeps internal: render the public component the row names,
or build the part.

`plugin.json` makes the package an Agent Plugin. An agent that installs
`@pagopa/ui` therefore also installs the `figma-to-ui` skill, which is the
procedure that turns a layout into components: it says how a status is read, what
to do when a part has no row, and when a part is a gap in the design system
rather than something to build.
