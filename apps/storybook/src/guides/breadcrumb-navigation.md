<!-- component-rules:start -->

## Component Rules

- Desktop: ancestor levels are links and the current page is not clickable; mobile: one compact back reaches the previous flow level.
- Mobile and tablet portrait use the Compact layout.

<!-- component-rules:end -->

`Breadcrumb` keeps the existing `items` interface and the Extended layout by
default. Ancestors with a destination are real links; an ancestor without `href`
is text, never an invented `#` link. The last item is non-interactive and
announces the current page even if its data contains an `href`.

Use an explicit destination for the Compact layout:

```tsx
<Breadcrumb
  layout="compact"
  back={{ label: "Torna ai servizi", href: "/servizi" }}
  aria-label="Percorso del servizio"
/>
```

Compact does not infer a parent from unrelated history or incomplete items.

## Next.js App Router

The provider's router component and dictionaries can contain functions. Define
them inside a Client Component instead of passing them from a Server Component:

```tsx
// app/providers.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { UIProvider, enMessages, type LinkComponentProps } from "@pagopa/ui"

const RouterLink = React.forwardRef<HTMLAnchorElement, LinkComponentProps>(function RouterLink(
  { href, ...props },
  ref,
) {
  return <Link {...props} href={href} ref={ref} />
})

const messages = {
  ...enMessages,
  pagination: {
    ...enMessages.pagination,
    previousLabel: "Earlier results",
    pageLabel: (page: number) => `Result page ${page}`,
  },
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider linkComponent={RouterLink} locale="en-US" messages={messages}>
      {children}
    </UIProvider>
  )
}
```

The server layout imports the stylesheet once and passes its rendered children
through that boundary; it does not pass the dictionary or link function:

```tsx
// app/layout.tsx
import type { ReactNode } from "react"
import "@pagopa/ui/styles.css"
import { Providers } from "./providers"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

Forward the anchor attributes and ref so the router retains native link
behaviour, including modifier-click navigation. The installed-package check
exercises this wrapper with request-time rendering and browser hydration.

Both layouts use the source chevron and back artwork rather than a generic
divider. Each native link expands its pointer target invisibly to the accessible
minimum without making the visible row taller. Labels remain content-driven and
wrap within narrow layouts instead of inheriting a fixed width. Decorative
separators do not create extra spoken list items. Native Safari link traversal
uses Option-Tab unless its full Tab navigation setting is enabled; the installed
WebKit check follows that platform convention.
