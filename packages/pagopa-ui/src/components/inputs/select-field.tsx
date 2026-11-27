"use client"

import * as React from "react"

import { cn } from "@/lib/cn"
import { Icon } from "@/components/icons/icon"
import { Default as AccountBalanceIcon } from "@/components/icons/generated/account-balance"
import { Down as ChevronDownIcon, Up as ChevronUpIcon } from "@/components/icons/generated/chevron"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select"

import { FieldMessages, FloatingFieldLabel } from "./field"
import {
  describedBy,
  useFieldIds,
  useFormReset,
  useInputRef,
  type FieldStateProps,
} from "./field-utils"
import { useChoiceAction, type ChoiceAction } from "./choice-action"
import {
  ChoiceActionButton,
  SelectOptionItem,
  focusChoiceActionOnReverseTab,
  type SelectOption,
} from "./select-parts"

export type { SelectOption } from "./select-parts"

/**
 * Props of {@link SelectField}. `ref` points at the trigger while `className`
 * and the standard HTML attributes of a `div` land on the field's root.
 */
export interface SelectFieldProps
  extends Omit<React.ComponentProps<"div">, "children" | "className" | "ref">, FieldStateProps {
  /** Ref to the trigger, so a consumer can focus it or read it back. */
  ref?: React.Ref<HTMLButtonElement>
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
  leadingIcon = <Icon source={AccountBalanceIcon} size={24} />,
  "aria-describedby": ariaDescribedBy,
  className,
  ref,
  ...props
}: SelectFieldProps) {
  const ids = useFieldIds(id)
  const { inputRef: triggerRef, mergedInputRef: mergedTriggerRef } =
    useInputRef<HTMLButtonElement>(ref)
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
    <Icon
      source={open ? ChevronUpIcon : ChevronDownIcon}
      size={24}
      className={
        disabled
          ? "pui:text-muted-foreground"
          : open || error
            ? "pui:text-primary"
            : "pui:text-foreground"
      }
    />
  )

  return (
    <div className={cn("pui:grid", error ? "pui:gap-0.5" : "pui:gap-2", className)} {...props}>
      <div className="pui:relative">
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
            ref={mergedTriggerRef}
            id={ids.controlId}
            icon={triggerIcon}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy(ids, state, ariaDescribedBy)}
            className="peer pui:relative pui:aria-expanded:border-2 pui:aria-expanded:border-primary"
          >
            {leadingIcon ? (
              <span
                data-slot="select-field-leading-icon"
                aria-hidden="true"
                inert
                className="pui:pointer-events-none pui:inline-flex pui:size-6 pui:shrink-0 pui:items-center pui:justify-center pui:text-choice-icon"
              >
                {leadingIcon}
              </span>
            ) : null}
            <SelectValue placeholder=" " className="pui:text-label-sb" />
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
                    ? "pui:p-0"
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
          className={open && filled ? "pui:text-primary" : undefined}
        />
      </div>
      {description || error || success ? (
        <div className="pui:px-3.5">
          <FieldMessages ids={ids} {...state} />
        </div>
      ) : null}
    </div>
  )
}

export { SelectField }
