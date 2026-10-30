One `Avatar` covers both source sizes and their visual states. The required `alt`
names the composite image throughout loading, selection and image recovery; the
internal native image is decorative. Callers supply `src`, optional `initials` and
any organisation or product artwork. The default `imageFit="cover"` preserves
photographs; `"contain"` places source logos on a white frame.

```tsx
<Avatar
  alt="Prodotto principale"
  src="/marchi/prodotto.png"
  imageFit="contain"
  size="small"
  secondary={{
    alt: "Organizzazione associata",
    src: "/marchi/organizzazione.png",
    initials: "OR",
    imageFit: "contain",
  }}
/>
```

`size="medium"` is a composition extension with no source counterpart. A missing
or failed image reveals the caller's `icon`, then initials or the source
placeholder; recovery restores the image without shrinking the fallback. The icon
slot is decorative and natively inert, even if it contains a caller-provided link.
`tone="inverse"` needs a contrasting caller-owned surface such as `navy`; it is not
a dark application theme.

The Avatar is **not a control**: its containing native button, link or labelled
checkbox owns actions and selection. `loading` takes visual precedence over
`selected`, announces busy state and keeps the actual selection text; completing
loading reveals the selection again, and the application owns the completion
announcement. Skeletons are static under reduced motion and keep a dashed
system-coloured perimeter under forced colours; selected artwork uses the system
Highlight and HighlightText palette.

`secondary` has its own identity and image lifecycle, without recursive pairing or
a second status or selection interface. Paired initials respect increased font
preferences and place the associated glyphs below the overlap instead of
concealing them. `status` belongs to the primary identity, and its shapes
supplement colour: online, offline and busy each have separate spoken text and
preserved system-colour shapes.

The pale placeholder and frame are not contrast-qualified informational
indicators: provide a visible identity label whenever identification is needed,
and do not rely on their faint geometry as the only information or control
boundary.
