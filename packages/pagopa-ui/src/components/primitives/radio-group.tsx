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
      className={cn("grid w-full gap-2", className)}
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
        "group/radio-group-item peer relative flex size-6 shrink-0 items-center justify-center rounded-full text-foreground outline-none after:absolute after:-inset-2.5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:text-destructive data-checked:text-primary aria-invalid:data-checked:text-primary",
        className,
      )}
      {...props}
    >
      <PagoPAIcon
        name="radio_button"
        variant="unchecked"
        className="group-data-checked/radio-group-item:hidden"
      />
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex items-center justify-center data-unchecked:hidden"
      >
        <PagoPAIcon name="radio_button" variant="checked" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Root>
  )
}

export { RadioGroup, RadioGroupItem }
