"use client"

import * as React from "react"
import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { cn } from "@/lib/cn"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

import { useFormReset, useInputRef } from "./form-control-utils"

function RadioGroup({
  className,
  value,
  defaultValue,
  onValueChange,
  inputRef: externalInputRef,
  ...props
}: RadioGroupPrimitive.Props) {
  const { inputRef, mergedInputRef } = useInputRef(externalInputRef)
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? null)
  useFormReset(inputRef, () => {
    if (value === undefined) setUncontrolledValue(defaultValue ?? null)
  })

  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      inputRef={mergedInputRef}
      value={value === undefined ? uncontrolledValue : value}
      onValueChange={(next, details) => {
        onValueChange?.(next, details)
        if (!details.isCanceled && value === undefined) setUncontrolledValue(next)
      }}
      className={cn("pui:grid pui:w-full pui:gap-2", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  inputRef: externalInputRef,
  ...props
}: RadioPrimitive.Root.Props) {
  const { inputRef, mergedInputRef } = useInputRef(externalInputRef)
  useFormReset(inputRef)

  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      inputRef={mergedInputRef}
      className={cn(
        "group/radio-group-item peer pui:relative pui:flex pui:size-6 pui:shrink-0 pui:items-center pui:justify-center pui:rounded-full pui:text-foreground pui:outline-none pui:after:absolute pui:after:-inset-2.5 pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring pui:data-disabled:cursor-not-allowed pui:data-disabled:opacity-50 pui:aria-invalid:text-destructive pui:data-checked:text-primary pui:aria-invalid:data-checked:text-primary",
        className,
      )}
      {...props}
    >
      <PagoPAIcon
        name="radio_button"
        variant="unchecked"
        className="pui:group-data-checked/radio-group-item:hidden"
      />
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="pui:flex pui:items-center pui:justify-center pui:data-unchecked:hidden"
      >
        <PagoPAIcon name="radio_button" variant="checked" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
