The values the library renders with are also a public contract: a page section
next to the components can read the same colours, spacing, radius and shadow
values instead of copying them. The contract is named for the role, not for the
Figma variable behind it, so a rename upstream never moves it.

## What is public

Three entries:

- `@pagopa/ui/styles.css` and `@pagopa/ui/tokens.css` declare the `--pui-*`
  custom properties on `:root`.
- `@pagopa/ui/tokens` exports the same values as typed data: `semanticTokens`,
  the `SemanticToken` and `SemanticTokenType` types, and the `figmaTokens`,
  `figmaTokenSource`, `FigmaToken` and `FigmaTokenType` inventory of the layer
  below.
- `@pagopa/ui/tokens.dtcg.json` is the same contract in Design Tokens Community
  Group format, for the tools that read it.

Two layers are internal:

- `--figma-*` custom properties are the build-time primitives the `--pui-*`
  values are generated from. They keep the Figma names, so they are internal and
  deprecated: read the semantic contract instead, and never override a
  `--figma-*` property.
- The Tailwind theme variables (`--color-*`, `--spacing-*`, `--text-*`,
  `--radius-*`, `--breakpoint-*`) drive the components and change with the theme,
  so a consumer never reads them.

## Loading the tokens

`styles.css` already ships the properties, so an application that renders the
components needs nothing else:

```tsx
import "@pagopa/ui/styles.css"
```

A stylesheet or a section that does not load the component styles imports the token
block on its own:

```tsx
import "@pagopa/ui/tokens.css"
```

The two are not exclusive: importing both loads the block once, because the
component stylesheet starts with the same `:root` declarations.

## Isolated component styles

The stylesheet scopes the design-system preflight, component utilities and
local rules to a `UIProvider` root. Import the CSS and wrap every component tree
in the provider:

```tsx
import { UIProvider } from "@pagopa/ui"
import "@pagopa/ui/styles.css"

export function App() {
  return (
    <UIProvider>
      <AppContent />
    </UIProvider>
  )
}
```

`UIProvider` renders a `display: contents` scope root, so it adds no layout box.
Direct component use outside the provider is no longer styled; move each
standalone component tree beneath one during migration. The provider keeps the
existing message, locale and link configuration.

The scope relies on CSS `@scope`: Chrome 118+, Safari 17.4+ or Firefox 128+.
There is no fallback. On an older browser the utilities and preflight do not
apply at all, so components render unstyled rather than losing isolation only.

Library rules are scoped to `.pagopa-ui-root` without `!important`: scope
proximity lets them win over host rules of equal specificity, such as a host
`button` reset or a `.p-6` utility. The same proximity means a host class of
equal specificity does not override a library utility on the same element: use
an inline `style`, a more specific selector, or a rule inside
`@scope (.pagopa-ui-root)`. Host rules marked `!important` still win; scope such
rules away from library trees.

Library overlays render in one shared, library-owned root appended to
`document.body` on first use, with or without a provider, and never capture
unrelated host dialogs or portals. Overlay content is client-rendered, like any
body portal. Server-rendered component markup remains in the provider root. The
root is a singleton per document: every provider and React root on the page
shares it, and it is not shadow-DOM or iframe aware.

The public `--pui-*` token variables remain on `:root` so host pages can read
them without entering a component scope. The component stylesheet no longer
resets the host body, headings or utilities. Applications that relied on those
global resets must add their own page styles instead.

## With CSS

Read a property with `var()` like any other custom property:

```css
.hero-band {
  padding: var(--pui-page-gutter);
  border-radius: var(--pui-radius);
  color: var(--pui-foreground);
  background: var(--pui-card);
  border: var(--pui-hairline) solid var(--pui-border);
}
```

## With TypeScript

`semanticTokens` is the contract as data: the CSS name, the role name, the
resolved value, the type, and the DTCG alias of the primitive it comes from.
Filter it by `type` to build a picker, a table or a generated example:

```tsx
import { semanticTokens } from "@pagopa/ui/tokens"

const colors = semanticTokens.filter((token) => token.type === "color")

export function ColorScale() {
  return (
    <ul>
      {colors.map((token) => (
        <li key={token.cssName}>
          <code>{token.cssName}</code> — {token.value}
        </li>
      ))}
    </ul>
  )
}
```

`figmaTokens` is the inventory of the primitive layer below, with the Figma name,
the CSS name and the value, for a page that has to show where a value comes from.

`figmaTokenSource` names the Figma file, the sync date and the export method of the
inventory, so a page can state where its values come from. Typography entries carry
`cssName: "text-*"`, because they are text classes rather than custom properties;
their `fontSize`, `lineHeight`, `fontWeight` and `letterSpacing` are the resolved
values.

## The contract is read-only

The tokens are published values, not theme inputs: redefining a `--pui-*` property
to restyle the components is unsupported and breaks the guarantee that what the page
renders and what the components render come from the same source. The supported
application theme is light only.

A renamed or removed token is a breaking change and reaches the package changelog
with a `minor` version plan.

## Maintaining library defaults

`pnpm nx run pagopa-ui:foundation:check` checks library CSS declarations and
inline `style` objects as well as utility strings. New literal lengths, colours,
typography, opacity and motion defaults must use semantic or foundation
references. Static local style bindings and literal fallbacks are checked too;
caller values, computed percentages, zero resets and system colours remain valid.
An unknown `--pui-*`, `--figma-*` or typography reference fails the check.

The declaration rules have a zero ceiling. The existing foundation exception
file can register a file/value match with a source node and a reason; stale
exceptions fail. Existing stylesheet-local extensions are pinned to their exact
value and owning selector in the checker, not exempted by a source comment.
Retire their colour/effect exceptions when the design owner resolves the existing
foundation request and ADR-0001 §9, and source geometry when its token is published.
Root-font-relative layout values are not replaced by px spacing tokens: that
would change host-font scaling. Font-face descriptors and the existing reduced
motion policy are not component styling defaults.
