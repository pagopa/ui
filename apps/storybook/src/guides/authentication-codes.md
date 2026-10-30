<!-- component-rules:start -->

## Component Rules

- The field width follows the number of characters in the code, so the boxes never misalign.

<!-- component-rules:end -->

`AuthenticationCodeInput` is a labelled group of real per-slot inputs, one per
digit. Base UI owns the value, the roving tabindex, arrow keys, paste, IME
composition and the hidden named input that carries the submitted value; the slots
stay decorative. The field paints each slot's frame, underline, mask marker and
cursor, so the artwork never depends on the input type or on the font's glyphs. The
native `<label>` names the group and the first slot, and every following slot
announces its position; the descriptions (caller `aria-describedby`, `description`,
`error`) stay associated with the first slot, and `error` marks every slot invalid
so the shared frame keeps its error stroke.

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

`mask` sets the native `type="password"` on every slot, so raw characters never
reach the DOM or the accessibility tree. It is native password masking, **not
cryptographic encryption**: JavaScript and `FormData` still receive the actual
code. The caller owns the character policy (`validationType` defaults to `numeric`;
`normalizeValue` and `onValueInvalid` cover custom rules), the native constraints,
the validation messages and the confirmation. `onValueComplete` receives the code
once every slot is filled, `autoSubmit` can submit the owning form, and the field
follows `value`/`defaultValue` plus `onValueChange`. The public `ref` stays the
first slot input, so `value`, `.focus()` and the owning form keep working.

`length` defaults to six; the source uses five slots. `length` and `mask` pick the
source state, and `error` adds the stroke and the message without a second layout
shift. The native label, the error icon and the enlarged slot targets are
accessibility adaptations. A press that lands on the frame padding, on a gap or on
a decorative glyph continues at the first empty slot instead of being swallowed,
so the whole frame stays a usable pointer target. There is one immediately solid
keyboard perimeter, including system-coloured frame, markers and cursor under
forced colours and a static cursor under reduced motion. Long labels and helper
text wrap inside narrow containers without truncating the default slots. Native
`disabled` preserves the code while excluding it from submission, and a native
reset restores the initial value.
