"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/cn"

import { useFormReset, useInputRef } from "./form-control-utils"
import { SpinnerIndicator } from "./spinner-indicator"

function Switch({
  className,
  size = "default",
  checked,
  defaultChecked = false,
  disabled,
  loading = false,
  onCheckedChange,
  inputRef: externalInputRef,
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
  loading?: boolean
}) {
  const { inputRef, mergedInputRef } = useInputRef(externalInputRef)
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked)
  useFormReset(inputRef, () => {
    if (checked === undefined) setUncontrolledChecked(defaultChecked)
  })

  return (
    // Source node 349:5484 (no registry entry of its own; SwitchField nodes compose
    // it). Binding adaptations: the 58×38px source frame rounds to the existing
    // w-14 × h-11 tokens (56×44px: −2px width, +6px height) so the native target
    // meets 44px, with the source 40×24px track and 20px knob centred in it
    // (`native-target-token-rounding`, `minimum-switch-target`). The checked knob
    // keeps its 16px travel (`checked-target-token-rounding`). Disabled keeps
    // Figma's 50% Element opacity on track/knob only and preserves the selected
    // state (`disabled-target-token-rounding`, `disabled-checked-target-token-rounding`).
    // Focus keeps the source 10px dot and adds a solid two-pixel outer keyboard
    // perimeter for visibility (`native-focus-target-token-rounding`,
    // `checked-focus-target-token-rounding`). The 38px off-state hover halo rounds
    // to size-10 (40px, +2px); the checked halo is the source 40px
    // (`hover-off-token-rounding`, `hover-on-target-token-rounding`). The source
    // loading node is a 40×28px wrapper around a real 24px spinner, not a fixed
    // switch size: the indicator stays centred in the 56×44px target while the
    // selection is preserved and disabled form exclusion applies
    // (`loading-target-and-source-wrapper`).
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      inputRef={mergedInputRef}
      checked={checked ?? uncontrolledChecked}
      onCheckedChange={(next, details) => {
        onCheckedChange?.(next, details)
        if (!details.isCanceled && checked === undefined) setUncontrolledChecked(next)
      }}
      className={cn(
        "peer group/switch pui:relative pui:isolate pui:inline-flex pui:h-11 pui:shrink-0 pui:items-center pui:justify-center pui:rounded-full pui:outline-none pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring pui:aria-invalid:focus-visible:outline-destructive pui:data-[size=default]:w-14 pui:data-[size=sm]:w-11 pui:data-disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    >
      {loading ? (
        <SpinnerIndicator dataSlot="switch-loading" />
      ) : (
        <span
          data-slot="switch-track"
          aria-hidden="true"
          className="pui:pointer-events-none pui:rounded-full pui:bg-switch-unchecked pui:transition-colors pui:group-data-[size=default]/switch:h-6 pui:group-data-[size=default]/switch:w-10 pui:group-data-[size=default]/switch:p-0.5 pui:group-data-[size=sm]/switch:h-3.5 pui:group-data-[size=sm]/switch:w-6 pui:group-data-[size=sm]/switch:p-px pui:group-data-checked/switch:bg-primary pui:group-data-disabled/switch:opacity-50 pui:forced-colors:forced-color-adjust-none pui:forced-colors:bg-[CanvasText] pui:forced-colors:group-data-checked/switch:bg-[Highlight]"
        >
          <SwitchPrimitive.Thumb
            data-slot="switch-thumb"
            className="pui:relative pui:isolate pui:block pui:bg-transparent pui:transition-transform pui:group-data-[size=default]/switch:size-5 pui:group-data-[size=sm]/switch:size-3 pui:group-data-[size=default]/switch:data-checked:translate-x-4 pui:group-data-[size=sm]/switch:data-checked:translate-x-2.5 pui:data-unchecked:translate-x-0"
          >
            <span
              aria-hidden="true"
              data-slot="switch-hover-halo"
              className="pui:pointer-events-none pui:absolute pui:top-1/2 pui:left-1/2 pui:z-0 pui:size-8 pui:-translate-1/2 pui:rounded-full pui:bg-foreground/8 pui:opacity-0 pui:group-data-[size=default]/switch:size-10 pui:group-hover/switch:opacity-100 pui:group-data-disabled/switch:hidden pui:group-data-checked/switch:bg-primary/8 pui:forced-colors:hidden"
            />
            <span
              aria-hidden="true"
              data-slot="switch-thumb-surface"
              className="pui:absolute pui:inset-0 pui:z-10 pui:rounded-full pui:bg-switch-knob pui:shadow-switch-knob pui:forced-colors:bg-[Canvas] pui:forced-colors:shadow-none pui:forced-colors:group-data-checked/switch:bg-[HighlightText]"
            />
            <span
              aria-hidden="true"
              data-slot="switch-focus-dot"
              className="pui:pointer-events-none pui:absolute pui:top-1/2 pui:left-1/2 pui:z-20 pui:size-1.5 pui:-translate-1/2 pui:rounded-full pui:bg-switch-unchecked pui:opacity-0 pui:group-data-[size=default]/switch:size-2.5 pui:group-focus-visible/switch:opacity-100 pui:group-data-checked/switch:bg-primary pui:forced-colors:bg-[CanvasText] pui:forced-colors:group-data-checked/switch:bg-[Highlight]"
            />
          </SwitchPrimitive.Thumb>
        </span>
      )}
    </SwitchPrimitive.Root>
  )
}

export { Switch }
