import type * as React from "react"

/**
 * Props every `@pagopa/ui` component inherits from the element it renders: the
 * native attributes of that element, with the three the design system owns
 * narrowed to the shape the component actually applies.
 *
 * Written here, once, so a component's public props never name the primitives
 * layer's third-party implementation in the published types.
 *
 * @typeParam Tag - The HTML element the component renders.
 */
export type ElementProps<Tag extends keyof React.JSX.IntrinsicElements> = Omit<
  React.ComponentPropsWithRef<Tag>,
  "className" | "color" | "defaultValue" | "defaultChecked" | "style"
> & {
  /** Classes merged after the component's own. */
  className?: string
  /**
   * Renders a different element in place of the default one: the component's
   * own props and the passed element's are merged.
   */
  render?: React.ReactElement<Record<string, unknown>>
  /** Inline style, applied after the component's own. */
  style?: React.CSSProperties
}

/**
 * What a change callback receives beside the new value: the reason, the native
 * event and the two escape hatches the underlying layer offers.
 *
 * Declared structurally so the published types do not depend on the primitives
 * layer's implementation.
 */
export interface ChangeEventDetails {
  /** Why the value changed, e.g. `"inputChange"` or `"triggerPress"`. */
  reason: string
  /** The native event behind the change. */
  event: Event
  /** Stops the component from applying the change. */
  cancel: () => void
  /** Lets the event propagate where the component would otherwise stop it. */
  allowPropagation: () => void
  /** Whether `cancel()` was called. */
  isCanceled: boolean
  /** Whether propagation was allowed. */
  isPropagationAllowed: boolean
  /** The element that triggered the change, when the change has one. */
  trigger: Element | undefined
}

/**
 * What a notification callback receives beside the value: the reason and the
 * native event, with neither escape hatch, matching the events that already
 * happened before the callback runs.
 */
export interface GenericEventDetails {
  /** Why the event fired, e.g. `"inputPaste"`. */
  reason: string
  /** The native event behind it. */
  event: Event
}
