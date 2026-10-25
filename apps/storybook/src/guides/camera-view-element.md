# CameraViewElement

`CameraViewElement` implements the Figma component `CameraViewElement`
(`1134:6812`): the framing overlay a camera preview paints around the area the
reader has to capture.

| Source layer     | Source property                        | Implementation                                 |
| ---------------- | -------------------------------------- | ---------------------------------------------- |
| `Rectangle 5`    | 376×378, radius 16, `#0e0f13` at 35%   | `bg-overlay` on `rounded-2xl`, one square box  |
| `Vector 72`–`75` | four 44×44 corner brackets, 4px, white | four 44px spans with a 4px border, 24px elbows |
| `Line 55`        | 208×4 white guide line, centred        | a 4px line 4px inside the inset span           |
| —                | the crop inset                         | `inset-[21.3%]`, the source 80px at 376        |

The four brackets sit 80px inside the frame's edges at the source width; the
percentage inset keeps that margin at any width, and the line spans the space
between them.

## Example

```tsx
<CameraViewElement active={streaming} label="Inquadra il codice">
  <video ref={video} autoPlay playsInline muted />
</CameraViewElement>
```

## Behaviour

The frame is `aspect-square` at the width the caller sets in `--camera-size`,
capped at the space it receives. The crop and the line are decorative
(`aria-hidden`): the instruction is announced once, through the `announcement`
function, which receives the label and the camera state and returns the whole
sentence — the caller owns grammar and language. With no children the component
draws its own camera glyph in the centre, a runtime extension the source frame
does not contain; pass `children` (including `null`) to place the live preview
or to clear the centre. `active` only changes the announcement, because the
source draws no active/inactive paint.
