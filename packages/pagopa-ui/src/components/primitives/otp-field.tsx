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
import { MinusIcon } from "./icons"

import { useFormReset, useInputRef } from "./form-control-utils"

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
}: Omit<React.ComponentProps<typeof OTPFieldPrimitive.Root>, "ref"> & {
  className?: string
  ref?: React.Ref<HTMLInputElement>
}) {
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
          "cn-otp-field flex w-fit max-w-full min-w-0 items-center overflow-x-clip rounded-lg border border-otp-frame px-6 py-2 outline-none [overflow-clip-margin:var(--otp-clip-margin)] has-focus-visible:outline-2 has-focus-visible:outline-solid has-focus-visible:outline-offset-2 has-focus-visible:outline-ring has-disabled:opacity-50 has-aria-invalid:border-destructive has-aria-invalid:ring-1 has-aria-invalid:ring-inset has-aria-invalid:ring-destructive forced-colors:border-[CanvasText] forced-colors:has-aria-invalid:border-2 forced-colors:has-aria-invalid:ring-0 forced-colors:has-focus-visible:outline-[CanvasText]",
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
      className={cn("flex min-w-0 items-center gap-4", className)}
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
        "relative flex h-8.5 w-2.75 shrink-0 items-start justify-center text-body-sb leading-6.5 text-foreground",
        className,
      )}
    >
      <OTPFieldPrimitive.Input
        ref={index === 0 ? firstInputRef : undefined}
        data-slot="otp-field-input"
        className="peer absolute top-1/2 left-0 h-11 w-full min-w-0 -translate-y-1/2 bg-transparent p-0 opacity-0 outline-none"
        // The slot renders Base UI's own slot state, so the glyph, the mask
        // marker and the cursor can never desynchronize from the real value.
        render={(inputProps, state) => (
          <>
            <input {...inputProps} />
            {mask && state.value !== "" ? (
              <span
                data-slot="otp-field-mask"
                aria-hidden="true"
                className="pointer-events-none absolute top-3.5 left-0.5 size-2 rounded-full bg-foreground forced-colors:forced-color-adjust-none forced-colors:bg-[CanvasText]"
              />
            ) : null}
            {state.value !== "" && !mask ? (
              <span data-slot="otp-field-glyph" aria-hidden="true" className="pointer-events-none">
                {state.value}
              </span>
            ) : null}
            <span
              data-slot="otp-field-caret"
              aria-hidden="true"
              className="pointer-events-none absolute top-2 left-1/2 hidden h-4 w-0.5 -translate-x-1/2 rounded-full bg-primary motion-safe:animate-caret-blink forced-colors:forced-color-adjust-none forced-colors:bg-[CanvasText] peer-[:focus:not([data-filled])]:block"
            />
          </>
        )}
        {...props}
      />
      <span
        data-slot="otp-field-underline"
        aria-hidden="true"
        className="pointer-events-none absolute top-7 left-0 h-px w-full bg-muted-foreground forced-colors:forced-color-adjust-none forced-colors:bg-[CanvasText]"
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
      className={cn("flex items-center [&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    >
      <MinusIcon />
    </OTPFieldPrimitive.Separator>
  )
}

export { OTPField, OTPFieldGroup, OTPFieldSlot, OTPFieldSeparator }
