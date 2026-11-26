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
        "group/checkbox peer pui:relative pui:flex pui:size-6 pui:shrink-0 pui:items-center pui:justify-center pui:text-foreground pui:outline-none pui:after:absolute pui:after:-inset-2.5 pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring pui:data-disabled:cursor-not-allowed pui:data-disabled:opacity-50 pui:aria-invalid:text-destructive pui:data-checked:text-primary pui:aria-invalid:data-checked:text-primary",
        className,
      )}
      {...props}
    >
      <PagoPAIcon
        name="check_box"
        variant="unchecked"
        className="pui:group-data-checked/checkbox:hidden pui:group-data-indeterminate/checkbox:hidden"
      />
      <PagoPAIcon
        name="check_box"
        variant="indeterminate"
        className="pui:hidden pui:group-data-indeterminate/checkbox:block"
      />
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="pui:flex pui:items-center pui:justify-center pui:data-unchecked:hidden pui:data-indeterminate:hidden"
      >
        <PagoPAIcon name="check_box" variant="checked" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
