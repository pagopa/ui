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
        "peer group/switch relative isolate inline-flex h-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:focus-visible:outline-destructive data-[size=default]:w-14 data-[size=sm]:w-11 data-disabled:cursor-not-allowed",
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
          className="pointer-events-none rounded-full bg-switch-unchecked transition-colors group-data-[size=default]/switch:h-6 group-data-[size=default]/switch:w-10 group-data-[size=default]/switch:p-0.5 group-data-[size=sm]/switch:h-3.5 group-data-[size=sm]/switch:w-6 group-data-[size=sm]/switch:p-px group-data-checked/switch:bg-primary group-data-disabled/switch:opacity-50 forced-colors:forced-color-adjust-none forced-colors:bg-[CanvasText] forced-colors:group-data-checked/switch:bg-[Highlight]"
        >
          <SwitchPrimitive.Thumb
            data-slot="switch-thumb"
            className="relative isolate block bg-transparent transition-transform group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-4 group-data-[size=sm]/switch:data-checked:translate-x-2.5 data-unchecked:translate-x-0"
          >
            <span
              aria-hidden="true"
              data-slot="switch-hover-halo"
              className="pointer-events-none absolute top-1/2 left-1/2 z-0 size-8 -translate-1/2 rounded-full bg-foreground/8 opacity-0 group-data-[size=default]/switch:size-10 group-hover/switch:opacity-100 group-data-disabled/switch:hidden group-data-checked/switch:bg-primary/8 forced-colors:hidden"
            />
            <span
              aria-hidden="true"
              data-slot="switch-thumb-surface"
              className="absolute inset-0 z-10 rounded-full bg-switch-knob shadow-switch-knob forced-colors:bg-[Canvas] forced-colors:shadow-none forced-colors:group-data-checked/switch:bg-[HighlightText]"
            />
            <span
              aria-hidden="true"
              data-slot="switch-focus-dot"
              className="pointer-events-none absolute top-1/2 left-1/2 z-20 size-1.5 -translate-1/2 rounded-full bg-switch-unchecked opacity-0 group-data-[size=default]/switch:size-2.5 group-focus-visible/switch:opacity-100 group-data-checked/switch:bg-primary forced-colors:bg-[CanvasText] forced-colors:group-data-checked/switch:bg-[Highlight]"
            />
          </SwitchPrimitive.Thumb>
        </span>
      )}
    </SwitchPrimitive.Root>
  )
}

export { Switch }
