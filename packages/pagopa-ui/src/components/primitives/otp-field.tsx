"use client"

// Base UI OTP Field, isolated so the library keeps a single seam to the
// third-party implementation: only the primitives layer may import it (import
// layer contract, enforced by `pnpm layers:check`). The composed field lives in the inputs family.
//
// Base UI renders one real <input> per slot (roving tabindex, arrow keys,
// paste, IME) plus a hidden named input that owns form submission. The source
// artwork stays ours: every input is an invisible interaction surface and each
// slot keeps the reviewed 11×34px frame, its underline, the rounded mask marker
// and the 2×16px cursor as decorative siblings, so the glyph geometry never
// depends on the input type or on the bundled font. The inputs are 44px tall
// (centred on the 34px slot) and the frame routes a press that misses them to
// the first empty slot, so the source frame stays a usable pointer target.
import * as React from "react"
import { OTPField as OTPFieldPrimitive } from "@base-ui/react/otp-field"
import { cn } from "@/lib/cn"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

import { useFormReset, useInputRef } from "./form-control-utils"
import type { ChangeEventDetails, ElementProps, GenericEventDetails } from "./props"

interface OTPFieldConfig {
  mask: boolean
  firstInputRef: React.RefCallback<HTMLInputElement> | null
}

const OTPFieldConfigContext = React.createContext<OTPFieldConfig | null>(null)

function useOTPFieldConfig() {
  const config = React.useContext(OTPFieldConfigContext)
  if (!config) throw new Error("OTP field parts must be rendered inside <OTPField>")
  return config
}

type OTPFieldProps = Omit<ElementProps<"div">, "defaultValue" | "onChange" | "ref" | "value"> & {
  /** The id of the first input; the following ones derive from it. */
  id?: string
  /** `autocomplete` of the first slot and of the hidden validation input. @default "one-time-code" */
  autoComplete?: string
  /** The form the hidden input belongs to. */
  form?: string
  /** The number of slots. */
  length: number
  /** Submits the owning form when the value becomes complete. @default false */
  autoSubmit?: boolean
  /** Masks the entered characters. @default false */
  mask?: boolean
  /** `inputmode` of the slot inputs and of the hidden validation input. */
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  /** The characters the field accepts. @default "numeric" */
  validationType?: "numeric" | "alpha" | "alphanumeric" | "none"
  /** Normalizes the value after the whitespace and `validationType` filtering. */
  normalizeValue?: (value: string) => string
  /** Whether the user must fill the field before submitting. @default false */
  required?: boolean
  /** Whether the field ignores user interaction. @default false */
  disabled?: boolean
  /** Whether the user cannot change the value. @default false */
  readOnly?: boolean
  /** The name the value is submitted with. */
  name?: string
  /** The controlled value. */
  value?: string
  /** The value of the uncontrolled field. @default "" */
  defaultValue?: string
  /** Called when the value changes. */
  onValueChange?: (value: string, details: ChangeEventDetails) => void
  /** Called when the entered text carries characters the field rejects. */
  onValueInvalid?: (value: string, details: GenericEventDetails) => void
  /** Called when the value becomes complete. */
  onValueComplete?: (value: string, details: GenericEventDetails) => void
  /** The first slot input. */
  ref?: React.Ref<HTMLInputElement>
}

function OTPField({
  className,
  value,
  defaultValue = "",
  onValueChange,
  mask = false,
  disabled,
  readOnly,
  onMouseDown,
  ref: externalRef,
  ...props
}: OTPFieldProps) {
  const initialValue = typeof defaultValue === "string" ? defaultValue : ""
  const [uncontrolledValue, setUncontrolledValue] = React.useState(initialValue)
  // The public ref stays the first slot input (the native control the caller
  // used to reach), so `value`, `.focus()` and the owning form keep working.
  const { inputRef, mergedInputRef } = useInputRef(externalRef)
  useFormReset(inputRef, () => {
    if (value === undefined) setUncontrolledValue(initialValue)
  })

  const config = React.useMemo(
    () => ({ mask, firstInputRef: mergedInputRef }),
    [mask, mergedInputRef],
  )

  return (
    <OTPFieldConfigContext.Provider value={config}>
      <OTPFieldPrimitive.Root
        data-slot="otp-field"
        value={value ?? uncontrolledValue}
        disabled={disabled}
        readOnly={readOnly}
        mask={mask}
        onValueChange={(next, details) => {
          onValueChange?.(next, details)
          if (value === undefined) setUncontrolledValue(next)
        }}
        onMouseDown={(event) => {
          onMouseDown?.(event)
          if (event.defaultPrevented || disabled || readOnly) return
          // The inputs only cover their own 11px slot: a press on the padding,
          // on a gap or on a decorative glyph continues at the next empty slot
          // instead of being swallowed by the frame.
          if (event.target instanceof HTMLInputElement) return
          const inputs = Array.from(event.currentTarget.querySelectorAll("input"))
          const filled = inputs.filter((input) => input.hasAttribute("data-filled")).length
          const nextInput = inputs[Math.min(filled, Math.max(inputs.length - 1, 0))]
          if (!nextInput) return
          event.preventDefault()
          nextInput.focus()
        }}
        className={cn(
          "cn-otp-field pui:flex pui:w-fit pui:max-w-full pui:min-w-0 pui:items-center pui:overflow-x-clip pui:rounded-lg pui:border pui:border-otp-frame pui:px-6 pui:py-2 pui:outline-none pui:[overflow-clip-margin:var(--pui-otp-clip-margin)] pui:has-focus-visible:outline-2 pui:has-focus-visible:outline-solid pui:has-focus-visible:outline-offset-2 pui:has-focus-visible:outline-ring pui:has-disabled:opacity-50 pui:has-aria-invalid:border-destructive pui:has-aria-invalid:ring-1 pui:has-aria-invalid:ring-inset pui:has-aria-invalid:ring-destructive pui:forced-colors:border-[CanvasText] pui:forced-colors:has-aria-invalid:border-2 pui:forced-colors:has-aria-invalid:ring-0 pui:forced-colors:has-focus-visible:outline-[CanvasText]",
          className,
        )}
        {...props}
      />
    </OTPFieldConfigContext.Provider>
  )
}

function OTPFieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="otp-field-group"
      className={cn("pui:flex pui:min-w-0 pui:items-center pui:gap-4", className)}
      {...props}
    />
  )
}

function OTPFieldSlot({
  index,
  className,
  ...props
}: Omit<React.ComponentProps<typeof OTPFieldPrimitive.Input>, "children" | "render"> & {
  index: number
  className?: string
}) {
  const { mask, firstInputRef } = useOTPFieldConfig()

  return (
    <div
      data-slot="otp-field-slot"
      className={cn(
        "pui:relative pui:flex pui:h-8.5 pui:w-2.75 pui:shrink-0 pui:items-start pui:justify-center pui:text-body-sb pui:leading-6.5 pui:text-foreground",
        className,
      )}
    >
      <OTPFieldPrimitive.Input
        ref={index === 0 ? firstInputRef : undefined}
        data-slot="otp-field-input"
        className="peer pui:absolute pui:top-1/2 pui:left-0 pui:h-11 pui:w-full pui:min-w-0 pui:-translate-y-1/2 pui:bg-transparent pui:p-0 pui:opacity-0 pui:outline-none"
        // The slot renders Base UI's own slot state, so the glyph, the mask
        // marker and the cursor can never desynchronize from the real value.
        render={(inputProps, state) => (
          <>
            <input {...inputProps} />
            {mask && state.value !== "" ? (
              <span
                data-slot="otp-field-mask"
                aria-hidden="true"
                className="pui:pointer-events-none pui:absolute pui:top-3.5 pui:left-0.5 pui:size-2 pui:rounded-full pui:bg-foreground pui:forced-colors:forced-color-adjust-none pui:forced-colors:bg-[CanvasText]"
              />
            ) : null}
            {state.value !== "" && !mask ? (
              <span
                data-slot="otp-field-glyph"
                aria-hidden="true"
                className="pui:pointer-events-none"
              >
                {state.value}
              </span>
            ) : null}
            <span
              data-slot="otp-field-caret"
              aria-hidden="true"
              className="pui:pointer-events-none pui:absolute pui:top-2 pui:left-1/2 pui:hidden pui:h-4 pui:w-0.5 pui:-translate-x-1/2 pui:rounded-full pui:bg-primary pui:motion-safe:animate-caret-blink pui:forced-colors:forced-color-adjust-none pui:forced-colors:bg-[CanvasText] pui:peer-[:focus:not([data-filled])]:block"
            />
          </>
        )}
        {...props}
      />
      <span
        data-slot="otp-field-underline"
        aria-hidden="true"
        className="pui:pointer-events-none pui:absolute pui:top-7 pui:left-0 pui:h-px pui:w-full pui:bg-muted-foreground pui:forced-colors:forced-color-adjust-none pui:forced-colors:bg-[CanvasText]"
      />
    </div>
  )
}

function OTPFieldSeparator({
  className,
  ...props
}: Omit<React.ComponentProps<typeof OTPFieldPrimitive.Separator>, "className"> & {
  className?: string
}) {
  return (
    <OTPFieldPrimitive.Separator
      data-slot="otp-field-separator"
      className={cn(
        "pui:flex pui:items-center pui:[&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <PagoPAIcon name="check_indeterminate_small" />
    </OTPFieldPrimitive.Separator>
  )
}

export { OTPField, OTPFieldGroup, OTPFieldSlot, OTPFieldSeparator }
export type { OTPFieldProps }
