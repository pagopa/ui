"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { cn } from "@/lib/cn"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

import { useFormReset, useInputRef } from "./form-control-utils"

function Checkbox({
  className,
  checked,
  defaultChecked = false,
  onCheckedChange,
  inputRef: externalInputRef,
  ...props
}: CheckboxPrimitive.Root.Props) {
  const { inputRef, mergedInputRef } = useInputRef(externalInputRef)
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked)
  useFormReset(inputRef, () => {
    if (checked === undefined) setUncontrolledChecked(defaultChecked)
  })

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      inputRef={mergedInputRef}
      checked={checked ?? uncontrolledChecked}
      onCheckedChange={(next, details) => {
        onCheckedChange?.(next, details)
        if (!details.isCanceled && checked === undefined) setUncontrolledChecked(next)
      }}
      className={cn(
        "group/checkbox peer relative flex size-6 shrink-0 items-center justify-center text-foreground outline-none after:absolute after:-inset-2.5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring focus:data-unchecked:text-destructive data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:text-destructive data-checked:text-primary aria-invalid:data-checked:text-primary",
        className,
      )}
      {...props}
    >
      <PagoPAIcon
        name="check_box"
        variant="unchecked"
        className="group-data-checked/checkbox:hidden"
      />
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center data-unchecked:hidden"
      >
        <PagoPAIcon name="check_box" variant="checked" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
