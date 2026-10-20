One `Avatar` covers both source sizes and their visual states. Required `alt`
names the composite image throughout loading, selection and image recovery;
the internal native image is decorative. Callers supply `src`, optional
`initials` and any organization/product artwork. The default `imageFit="cover"`
preserves photographs; `"contain"` places source logos on a white frame.
Source municipality, institution and service variants show distinct caller
artwork. `SourceLogos` reuses the bundled product mark as a representative
`src`, so those cases inspect the Avatar frame and contained-image geometry,
not parity of the caller-owned brand artwork.

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

The source sizes map to the existing size tokens through the nearest compatible
step; `medium` remains a composition extension with no source counterpart.
Contained logos and the placeholder/selection glyphs likewise use the nearest
existing tokens instead of near-match literals. A missing or failed image
reveals the caller's `icon`, then initials or the actual source placeholder;
recovery restores the image without shrinking the fallback. The optional icon
slot is decorative and natively inert, even if it contains a caller-provided
link. `tone="inverse"` needs a contrasting caller-owned surface such as `navy`;
it is not a dark application theme.

The Avatar is **not a control**: its containing native button, link or labelled
checkbox owns actions and selection. `loading` takes visual precedence over
`selected`, announces busy state and keeps the actual selection text; completing
loading reveals the selection again. The application owns completion
announcements. Source skeletons are static under reduced motion and retain a
dashed system-colored perimeter under forced colors. Selected artwork uses the
system Highlight/HighlightText palette.

`secondary` has its own identity and image lifecycle, without recursive pairing
or a second status/selection interface. The paired form scales proportionally
from the source composition; paired initials respect increased font preferences
and place the associated glyphs below the overlap instead of concealing them.
`status` belongs to the primary identity, and its shapes supplement colour:
online, offline and busy each have separate spoken text and preserved
system-color shapes.

The pale source placeholder and frame are not contrast-qualified informational
indicators. Provide a visible identity label whenever identification is needed;
do not rely on their faint geometry as the only information or control boundary.
Bundled typography, proportional adaptations, status shapes and accessible
state ownership are explicit deviations, not pixel-identical or manual
screen-reader/browser-zoom certification.
