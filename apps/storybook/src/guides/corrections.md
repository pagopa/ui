`CorrectionTag` implements the Figma `Correction/Valid` and `Correction/NotValid`
components, each a single status `Tag` with its glyph and an uppercase label.
`status="valid"` renders the success tag with `check_circle` and the default
label `EVENTO RETTIFICATO`; `status="not-valid"` renders the warning tag with
`warning` and the default label `EVENTO NON VALIDO`.

## Example

```tsx
<CorrectionTag status="not-valid" />
<CorrectionTag status="valid" label="Evento rettificato dal gestore" />
```

`label` is the visible text and the only content: the icon is decorative, so the
tag is announced by its copy. The default is Italian and every consumer can
replace it. `MicroEvent` and the Timeline status card compose this tag.
