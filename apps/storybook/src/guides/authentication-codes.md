<!-- component-rules:start -->

## Component Rules

- The field width follows the number of characters in the code, so the boxes never misalign.

<!-- component-rules:end -->

`AuthenticationCodeInput` is a labelled group of real per-slot inputs, one per
digit. Base UI owns the value, the roving tabindex, arrow keys, paste, IME
composition and the hidden named input that carries the submitted value; the
slots stay decorative. Each slot's frame, underline, mask marker and cursor are
painted by the field, so the artwork never depends on the input type or on the
bundled font's glyphs. The native `<label>` names the group and the first slot,
and every following slot announces its position; the descriptions (caller
`aria-describedby`, `description`, `error`) stay associated with the first slot,
and `error` marks every slot invalid so the shared frame keeps its error stroke.

```tsx
<AuthenticationCodeInput
  label="Codice di verifica"
  name="verificationCode"
  length={5}
  mask
  required
  description="Puoi digitare o incollare l'intero codice."
  onValueComplete={(code) => verify(code)}
/>
```

`mask` selects the source's masked state: it sets the native `type="password"`
on every slot, so raw characters never reach the DOM or the accessibility tree.
It is visual/native password masking, **not cryptographic encryption**:
JavaScript and `FormData` still receive the actual code. The caller owns the
character policy (`validationType` defaults to `numeric`; `normalizeValue` and
`onValueInvalid` cover custom rules), the native constraints, the validation
messages and the confirmation; `onValueComplete` receives the code once every
slot is filled, and `autoSubmit` can submit the owning form automatically. The
field follows `value`/`defaultValue` plus `onValueChange`, and the public `ref`
stays the first slot input, so `value`, `.focus()` and the owning form keep
working.

The source set draws six `Status` variants — `Empty`, `Selected`, `Filled`,
`Encrypted`, `Error`, `Error encrypted` — as one five-slot frame (168x50,
radius 8, 8/24 insets, 27px slot step): an empty slot carries its underline, a
filled slot its glyph, `Selected` the 2x16px cursor, `Encrypted` the rounded
mask marker, and the two `Error` variants add the 2px `#d13333` stroke with the
associated message. `length` and `mask` pick the state; `error` adds the stroke
and the message.

The existing default length remains six; the source uses five slots. The
implementation uses the shared frame and padding tokens rather than one-off
values, so invalid state does not add another layout shift, and the helper text
follows the source's frame gap. The native label, error icon and enlarged
slot-input targets remain accessibility adaptations. Each slot input stays centred
on its frame, and a press that lands on the frame padding, on a gap or on a
decorative glyph continues at the first empty slot instead of being swallowed, so
the whole frame stays a usable pointer target. The mask marker is a token-sized
near-circular shape, independent of the bundled font's bullet glyph. There is one
immediately solid keyboard perimeter, including system-colored frame, markers and
cursor under forced colors and a static cursor under reduced motion. Long labels
and helper text wrap inside narrow containers without truncating the six default
slots. Native `disabled` preserves the code while excluding it from submission,
and a native reset restores the initial value.

Labels, associated feedback and bundled typography are deliberate adaptations,
not pixel-identical font or manual screen-reader certification: the native label
names the first slot, the remaining slots announce their position, and a screen
reader therefore walks the field slot by slot instead of announcing one textbox.
