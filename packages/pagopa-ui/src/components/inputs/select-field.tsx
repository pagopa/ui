"use client"

import * as React from "react"

import { cn } from "@/lib/cn"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select"

import { FieldMessages, FloatingFieldLabel } from "./field"
import { describedBy, useFieldIds, useFormReset, type FieldStateProps } from "./field-utils"
import { useChoiceAction, type ChoiceAction } from "./choice-action"
import {
  ChoiceActionButton,
  SelectOptionItem,
  focusChoiceActionOnReverseTab,
  type SelectOption,
} from "./select-parts"

export type { SelectOption } from "./select-parts"

type SelectFieldProps = FieldStateProps & {
  /** Id applied to the trigger, so an external label can target it; generated when omitted. */
  id?: string
  /** Options rendered in the listbox. */
  options: SelectOption[]
  /** Name of the hidden native field that owns the form value. */
  name?: string
  /** Controlled value. */
  value?: string
  /** Initial value for the uncontrolled field. */
  defaultValue?: string
  /** Called with the selected value; clearing never emits (the field has no empty value). */
  onValueChange?: (value: string) => void
  /** Source header command of the chooser (e.g. "Nuovo"). */
  action?: ChoiceAction
  /** Icon shown with the value; pass `null` to remove the default icon. */
  leadingIcon?: React.ReactNode
  /** ClassName applied to the field's root grid. */
  className?: string
}

function SelectField({
  id,
  label,
  options,
  description,
  error,
  success,
  required,
  requiredLabel,
  disabled,
  name,
  value,
  defaultValue,
  onValueChange,
  action,
  leadingIcon = <PagoPAIcon name="account_balance" size={24} />,
  className,
}: SelectFieldProps) {
  const ids = useFieldIds(id)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const actionButtonRef = React.useRef<HTMLButtonElement>(null)
  const [internalValue, setInternalValue] = React.useState<string | null>(defaultValue ?? null)
  const [open, setOpen] = React.useState(false)
  useFormReset(triggerRef, () => {
    if (value === undefined) setInternalValue(defaultValue ?? null)
  })
  const state = { description, error, success }
  const command = useChoiceAction(action, actionButtonRef)
  const currentValue = value === undefined ? internalValue : value
  const filled = currentValue != null
  const triggerIcon = (
    <PagoPAIcon
      name="chevron"
      variant={open ? "up" : "down"}
      size={24}
      className={
        disabled ? "text-muted-foreground" : open || error ? "text-primary" : "text-foreground"
      }
    />
  )

  return (
    <div className={cn("grid", error ? "gap-0.5" : "gap-2", className)}>
      <div className="relative">
        <Select
          {...command.rootProps}
          name={name}
          value={currentValue}
          required={required}
          disabled={disabled}
          items={options.map((option) => ({ value: option.value, label: option.label }))}
          onOpenChange={(open, eventDetails) => {
            setOpen(open)
            command.rootProps.onOpenChange(open, eventDetails)
          }}
          onValueChange={(nextValue) => {
            if (value === undefined) setInternalValue(nextValue)
            if (nextValue !== null) onValueChange?.(nextValue)
          }}
        >
          <SelectTrigger
            ref={triggerRef}
            id={ids.controlId}
            icon={triggerIcon}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy(ids, state)}
            className="peer relative aria-expanded:border-2 aria-expanded:border-primary"
          >
            {leadingIcon ? (
              <span
                data-slot="select-field-leading-icon"
                aria-hidden="true"
                inert
                className="pointer-events-none inline-flex size-6 shrink-0 items-center justify-center text-choice-icon"
              >
                {leadingIcon}
              </span>
            ) : null}
            <SelectValue placeholder=" " className="text-label-sb" />
          </SelectTrigger>
          {command.closeComplete ? null : (
            <SelectContent
              // The chooser is not a menu: its list opens right below the
              // trigger instead of overlapping the selected option.
              alignItemWithTrigger={false}
              aria-labelledby={`${ids.controlId}-label`}
              onKeyDown={(event) => focusChoiceActionOnReverseTab(event, action, actionButtonRef)}
              header={
                action ? (
                  <ChoiceActionButton
                    action={action}
                    onAction={command.onAction}
                    buttonRef={actionButtonRef}
                  />
                ) : undefined
              }
            >
              <SelectGroup
                className={
                  options.some((option) => option.description || option.leading || option.chip)
                    ? "p-0"
                    : undefined
                }
              >
                {options.map((option) => (
                  <SelectOptionItem key={option.value} option={option} />
                ))}
              </SelectGroup>
            </SelectContent>
          )}
        </Select>
        <FloatingFieldLabel
          id={`${ids.controlId}-label`}
          htmlFor={ids.controlId}
          label={label}
          required={!disabled && required}
          requiredLabel={requiredLabel}
          floated={filled}
          leadingIcon={Boolean(leadingIcon)}
          focusDriven={false}
          placeholderValue={false}
          className={open && filled ? "text-primary" : undefined}
        />
      </div>
      {description || error || success ? (
        <div className="px-3.5">
          <FieldMessages ids={ids} {...state} />
        </div>
      ) : null}
    </div>
  )
}

export { SelectField }
