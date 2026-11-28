"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { cn } from "@/lib/cn"
import {
  Default as CheckBoxUncheckedIcon,
  Indeterminate as CheckBoxIndeterminateIcon,
  Checked as CheckBoxCheckedIcon,
} from "@/components/icons/generated/check-box"

import { type ChangeEventDetails, type ElementProps } from "./props"
import { useFormReset, useInputRef } from "./form-control-utils"

/** Props of the `Checkbox`. */
export type CheckboxProps = ElementProps<"span"> & {
  /** Whether the box is checked. Use with `onCheckedChange`. */
  checked?: boolean
  /** Whether the box starts checked. Use without `checked`. @default false */
  defaultChecked?: boolean
  /** Whether the box ignores interaction. @default false */
  disabled?: boolean
  /** Whether the user may not change the value. @default false */
  readOnly?: boolean
  /** Whether a value is required before submitting the form. @default false */
  required?: boolean
  /** Renders the mixed state, for a group of children partially selected. */
  indeterminate?: boolean
  /** Names the value in the submitted form. */
  name?: string
  /** Id of the form that owns the input. */
  form?: string
  /** Value submitted when the box is checked. */
  value?: string
  /** Value submitted when the box is unchecked. */
  uncheckedValue?: string
  /** Access to the hidden `<input>`. */
  inputRef?: React.Ref<HTMLInputElement>
  /** Whether the box belongs to a parent box that owns the group state. @default false */
  parent?: boolean
  /**
   * Whether replacing the element with `render` keeps native `<button>`
   * behaviour. @default false
   */
  nativeButton?: boolean
  /** Called when the box is checked or unchecked. */
  onCheckedChange?: (checked: boolean, details: ChangeEventDetails) => void
}

function Checkbox({
  className,
  checked,
  defaultChecked = false,
  onCheckedChange,
  inputRef: externalInputRef,
  ...props
}: CheckboxProps) {
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
      <CheckBoxUncheckedIcon className="pui:group-data-checked/checkbox:hidden pui:group-data-indeterminate/checkbox:hidden" />
      <CheckBoxIndeterminateIcon className="pui:hidden pui:group-data-indeterminate/checkbox:block" />
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="pui:flex pui:items-center pui:justify-center pui:data-unchecked:hidden pui:data-indeterminate:hidden"
      >
        <CheckBoxCheckedIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
