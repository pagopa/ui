# Tokens

The Figma Variables the library renders with are also a public contract: a
page section that lives next to the components can read the same colours,
spacing, radius, shadow and z-index values instead of copying them.

## What is public

Two entries:

- `@pagopa/ui/styles.css` and `@pagopa/ui/tokens.css` declare the
  `--figma-*` custom properties on `:root`.
- `@pagopa/ui/tokens` exports the same values as typed data:
  `figmaTokens`, `figmaTokenSource` and the `FigmaToken` and `FigmaTokenType`
  types.

The Tailwind theme variables (`--color-*`, `--spacing-*`, `--text-*`,
`--radius-*`, `--breakpoint-*`) are internal: they drive the components and
change with the theme, so a consumer never reads them.

`packages/pagopa-ui/etc/tokens.txt` lists every public name. The
`pnpm nx run pagopa-ui:tokens:public:check` target compares the list with the
generated stylesheet and the typed list, so a token that appears, disappears or
changes name is a reviewed diff rather than a silent break.

## Loading the tokens

`styles.css` already ships the properties, so an application that renders the
components needs nothing else:

```tsx
import "@pagopa/ui/styles.css"
```

A stylesheet or a section that does not load the component styles imports the
token block on its own:

```tsx
import "@pagopa/ui/tokens.css"
```

The two are not exclusive: importing both loads the block once, because the
component stylesheet starts with the same `:root` declarations.

## With CSS

Read a property with `var()` like any other custom property:

```css
.hero-band {
  padding: var(--figma-spacing-24);
  border-radius: var(--figma-radius-16);
  color: var(--figma-color-neutrals-grey-850);
  box-shadow: var(--figma-shadow-32);
  z-index: var(--figma-z-10);
}
```

## With TypeScript

`figmaTokens` is the inventory of the same values, with the Figma name, the CSS
name and the value. Filter it by `category` to build a picker, a table or a
generated example:

```tsx
import { figmaTokens } from "@pagopa/ui/tokens"

const spacing = figmaTokens.filter((token) => token.category === "spacing")

export function SpacingScale() {
  return (
    <ul>
      {spacing.map((token) => (
        <li key={token.id}>
          <code>{token.cssName}</code> — {token.value}
        </li>
      ))}
    </ul>
  )
}
```

`figmaTokenSource` names the Figma file, the sync date and the export method of
the inventory, so a page can state where its values come from. Typography
entries carry `cssName: "text-*"`, because they are text classes rather than
custom properties; their `fontSize`, `lineHeight`, `fontWeight` and
`letterSpacing` are the resolved values.

## The contract is read-only

The tokens are published values, not theme inputs: redefining a `--figma-*`
property to restyle the components is unsupported and breaks the guarantee that
what the page renders and what the components render come from the same source.
The supported application theme is light only.

## Renames and removals

A renamed or removed token is a breaking change. It appears in the package
changelog with a `minor` version plan, and the action that moves it runs
`pnpm nx run pagopa-ui:tokens:public:check` with `--write` so the committed list
records the new contract.
