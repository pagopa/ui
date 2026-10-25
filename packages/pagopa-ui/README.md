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

## Router links

Every navigation link renders as a plain `<a>` unless a provider supplies the
application's link component. With Next.js:

```tsx
import Link from "next/link"
import { UIProvider } from "@pagopa/ui"

export default function Layout({ children }: { children: React.ReactNode }) {
  return <UIProvider linkComponent={Link}>{children}</UIProvider>
}
```

The component receives `href`, the anchor attributes and a `ref`; keep it
forwarding all of them so client-side routing, open-in-new-tab and which-link
focus survive. In-page `#id` links stay plain anchors.

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
