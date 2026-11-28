The values the library renders with are also a public contract: a page section
next to the components can read the same colours, spacing, radius and shadow
values instead of copying them. The contract is named for the role, not for the
Figma variable behind it, so a rename upstream never moves it.

## What is public

Three entries:

- `@pagopa/ui/tokens.css` declares the `--pui-*` custom properties on `:root`,
  for a page that reads the values beside the library rather than inside it.
- `@pagopa/ui/styles.css` declares the same properties on the provider root, the
  element that carries `.pagopa-ui-root`. A page that renders components loads
  this one; the override section below says where a replacement value lands.
- `@pagopa/ui/tokens` exports the same values as typed data: `semanticTokens`
  and the `SemanticToken` and `SemanticTokenType` types.
- `@pagopa/ui/tokens.dtcg.json` is the same contract in Design Tokens Community
  Group format, for the tools that read it: every `$value` is the value the
  stylesheet publishes, so a reader resolves no alias.

Two layers are internal:

- `--figma-*` custom properties are the build-time primitives the `--pui-*`
  values are generated from. They keep the Figma names and are resolved to their
  literals when the package is built, so no stylesheet ships one: a host reads
  the semantic contract instead, and there is no `--figma-*` property to set.
  Their inventory is build-time data too, so no entrypoint exports it.
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

`UIProvider` renders a `display: contents` root, so it adds no layout box.
Direct component use outside the provider is no longer styled; move each
standalone component tree beneath one during migration. The provider keeps the
existing message, locale and link configuration.

The stylesheet needs no `@scope`: it encapsulates with CSS cascade layers,
`@layer pagopa-ui.base, pagopa-ui.utilities`, plus zero-specificity `:where()`
root selectors. Any browser with layer support renders it as designed — Chrome
99+, Safari 15.4+, Firefox 97+ — including Firefox ESR and Safari below 17.4.

Precedence against the host is the ordinary cascade, in this order:

1. **A host rule marked `!important`** wins over every layer.
2. **Unlayered host CSS** wins over every layer, so a plain `.p-6` or a `button`
   reset in your own stylesheet overrides a library rule on the same element
   with no `!important` and no wrapper. There is no same-name utility to collide
   with: the library ships only `.pui\:p-6`, never a bare twin, so your `.p-6`
   and its `.pui\:p-6` sit beside each other and yours wins.
3. **A host cascade layer** wins over both library layers, because the library
   opens its layers at the head of the document and yours are ordered after
   them. A host `.p-6 { padding: 5px }` inside `@layer host.utilities` therefore
   also overrides the library's `.pui\:p-6`, including on a dialog body.
4. **The library layers**, `pagopa-ui.utilities` over `pagopa-ui.base`, with the
   base resets written at zero specificity so a class of yours still overrides
   one.

The resets reach the components and nothing else: they apply inside the roots
the library renders — every component root carries `data-slot`, and overlays
mount into a `data-pagopa-ui-portal-root` subtree — so legacy markup you render
inside `UIProvider` keeps the browser's own margins, list markers and
`content-box` box model.

Library overlays render in one shared, library-owned root appended to
`document.body` on first use, with or without a provider, and never capture
unrelated host dialogs or portals. Overlay content is client-rendered, like any
body portal. Server-rendered component markup remains in the provider root. The
root is a singleton per document: every provider and React root on the page
shares it, and it is not shadow-DOM or iframe aware.

The public `--pui-*` token variables sit on `:root` in `@pagopa/ui/tokens.css`,
so a host page reads them without entering a component tree. The provider root
declares them again and wins inside it, so the loader matters: `tokens.css` is
the contract a page reads, `styles.css` is the contract the components resolve.
The component stylesheet no longer resets the host body, headings or utilities.
Applications that relied on those global resets must add their own page styles
instead.

### The slot contract

Every public component stamps its root with `data-slot`, named after the
component in kebab case: `data-slot="dropdown"`, `data-slot="page-surface"`,
`data-slot="pago-pa-icon"`. The parts of an anatomy carry their own names
(`dropdown-item`, `chip-remove`), so a selector never has to reach a wrapper to
find something.

The attribute is not decoration. It is the hook the base resets and the
`@media (forced-colors: active)` and `prefers-reduced-motion` blocks key on, so a
root that loses its stamp silently escapes the accessibility overrides as well
as your selectors. Overlay panels are the root you see, and they carry the name
even though the component that opened them renders through a portal.

Name a root after its component, not after its parent part: `SideNav` is
`side-nav` and its panel is `side-nav-panel`, `EmptyState` is `empty-state` and
its drawing is `empty-state-icon`. A divergence is allowed only when a component
genuinely renders two anatomies, and then it is written down in
`src/data-slot-exceptions.json` with its reason.

`ui-cli check data-slots` enforces this, and the `pagopa-ui:test` target runs it:
a missing root slot, a root named after a part, and an exception that no longer
matches a defect all fail the check.

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
resolved value and the type. Filter it by `type` to build a picker, a table or
a generated example:

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

A token carries no pointer to the primitive behind it: that layer is build-time
data, and the value it resolves to is the whole of what the contract publishes.
A page that states where a value originates reads the manifest in the repository,
not a property of the contract.

## The contract is the override surface

The `--pui-*` properties are the published, host-overridable surface: every colour,
spacing, radius and type value a component renders reads one. A renamed or
removed token is a breaking change and reaches the package changelog with a
`minor` version plan.

Where the value is declared decides where a replacement lands. `styles.css`
declares the properties on the provider root, the element that carries
`.pagopa-ui-root`, and a declaration on an element wins over an inherited one —
so a property set on `html`, `body` or any ancestor **above** `UIProvider` never
reaches the components. Override on the provider root itself, or on any element
inside it:

```css
.theme-brand {
  --pui-primary: #0b3ee3;
  --pui-radius: 8px;
}
```

```tsx
<UIProvider>
  <div className="theme-brand">
    <Button>Continua</Button>
  </div>
</UIProvider>
```

The `--figma-*` custom properties are the internal build-time layer the `--pui-*`
values are generated from. The build resolves each one to the literal it names, so
the shipped stylesheets declare none of them: there is no property to read and no
property to set. The supported application theme is light only.

## Maintaining library defaults

`pnpm nx run pagopa-ui:foundation:check` checks library CSS declarations and
inline `style` objects as well as utility strings. New literal lengths, colours,
typography, opacity and motion defaults must use semantic or foundation
references. Static local style bindings and literal fallbacks are checked too;
caller values, computed percentages, zero resets and system colours remain valid.
An unknown `--pui-*` or typography reference fails the check, and a component
that references a `--figma-*` primitive fails it too: a component reads the role
the contract names, and only `index.css` writes the primitive a role resolves to.

The declaration rules have a zero ceiling. The existing foundation exception
file can register a file/value match with a source node and a reason; stale
exceptions fail. Existing stylesheet-local extensions are pinned to their exact
value and owning selector in the checker, not exempted by a source comment.
Retire their colour/effect exceptions when the design owner resolves the existing
foundation request and ADR-0001 §9, and source geometry when its token is published.
Root-font-relative layout values are not replaced by px spacing tokens: that
would change host-font scaling. Font-face descriptors and the existing reduced
motion policy are not component styling defaults.
