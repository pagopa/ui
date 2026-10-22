// The resting paint of an interactive element is only readable while the
// pointer is somewhere else: in the interaction runner the real cursor belongs
// to the page, so a pointer left on a link or a button paints its `:hover`
// variant and a play that asserts a colour reads the hover token instead of the
// source one.
//
// The browser provider owns that pointer: hovering the page body parks it in an
// empty place (see the parity capture, which parks it for the same reason). The
// module only exists inside the interaction runner; in the interactive
// Storybook there is no pointer to move and the call is a no-op.
export async function parkPointer() {
  const module = await import("@vitest/browser/context").catch(() => undefined)
  if (!module?.userEvent) return
  await module.userEvent.unhover(document.body)
  // The hover state follows the move on the next frame lock, like a capture's
  // settle: measure only after it.
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))),
  )
}
