"use client"

import * as React from "react"
import { Radio as RadioPrimitive } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"
import { cn } from "@/lib/cn"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

import { type ChangeEventDetails, type ElementProps } from "./props"
import { useFormReset, useInputRef } from "./form-control-utils"

/** Props of the `RadioGroup`. */
export type RadioGroupProps = ElementProps<"div"> & {
  /** Whether every item ignores interaction. @default false */
  disabled?: boolean
  /** Whether the user may not change the selection. @default false */
  readOnly?: boolean
  /** Whether a selection is required before submitting the form. @default false */
  required?: boolean
  /** Names the value in the submitted form. */
  name?: string
  /** Id of the form that owns the inputs. */
  form?: string
  /** The selected item. Use with `onValueChange`. */
  value?: string | null
  /** The item selected at first render. Use without `value`. */
  defaultValue?: string | null
  /** Access to the group's hidden `<input>`. */
  inputRef?: React.Ref<HTMLInputElement>
  /** Called when the selection changes. */
  onValueChange?: (value: string | null, details: ChangeEventDetails) => void
}

/** Props of one item of a `RadioGroup`. */
export type RadioGroupItemProps = ElementProps<"span"> & {
  /** The value this item contributes to the group. */
  value: string
  /** Whether the item ignores interaction. @default false */
  disabled?: boolean
  /** Whether the user may not change this item. @default false */
  readOnly?: boolean
  /** Whether selecting this item is required before submitting the form. @default false */
  required?: boolean
  /** Access to the item's hidden `<input>`. */
  inputRef?: React.Ref<HTMLInputElement>
  /**
   * Whether replacing the element with `render` keeps native `<button>`
   * behaviour. @default false
   */
  nativeButton?: boolean
}

function RadioGroup({
  className,
  value,
  defaultValue,
  onValueChange,
  inputRef: externalInputRef,
  ...props
}: RadioGroupProps) {
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

function RadioGroupItem({ className, inputRef: externalInputRef, ...props }: RadioGroupItemProps) {
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
