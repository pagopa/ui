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

import { InputChip } from "./chips"
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

/**
 * Props of {@link MultiSelectField}. `ref` points at the trigger while
 * `className` and the standard HTML attributes of a `div` land on the field's
 * root.
 */
export interface MultiSelectFieldProps
  extends Omit<React.ComponentProps<"div">, "children" | "className" | "ref">, FieldStateProps {
  /** Ref to the trigger, so a consumer can focus it or read it back. */
  ref?: React.Ref<HTMLButtonElement>
  /** Id applied to the trigger, so an external label can target it; generated when omitted. */
  id?: string
  /** Options of the listbox; the trigger renders a removable chip per selection. */
  options: SelectOption[]
  /** Controlled selection. */
  value?: string[]
  /** Initial selection for the uncontrolled field. @default [] */
  defaultValue?: string[]
  /** Called with the next selection after a toggle or a chip removal. */
  onValueChange?: (value: string[]) => void
  /** Name of the hidden native field that owns the form value. */
  name?: string
  /** Source header command of the chooser (e.g. "Nuovo"). */
  action?: ChoiceAction
  /** Icon shown with the value; pass `null` to remove the default icon. */
  leadingIcon?: React.ReactNode
  /** ClassName applied to the field's root grid. */
  className?: string
}

function MultiSelectField({
  id,
  label,
  options,
  value,
  defaultValue = [],
  onValueChange,
  description,
  error,
  success,
  required,
  requiredLabel,
  disabled,
  name,
  action,
  leadingIcon = <Icon source={AccountBalanceIcon} size={24} />,
  "aria-describedby": ariaDescribedBy,
  className,
  ref,
  ...props
}: MultiSelectFieldProps) {
  const ids = useFieldIds(id)
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const [open, setOpen] = React.useState(false)
  const { inputRef: triggerRef, mergedInputRef: mergedTriggerRef } =
    useInputRef<HTMLButtonElement>(ref)
  const actionButtonRef = React.useRef<HTMLButtonElement>(null)
  const command = useChoiceAction(action, actionButtonRef)
  useFormReset(triggerRef, () => {
    if (value === undefined) setInternalValue(defaultValue)
  })
  const currentValue = value ?? internalValue
  const filled = currentValue.length > 0
  const orderedSelection = options.filter((option) => currentValue.includes(option.value))
  const removeValue = (optionValue: string) => {
    const next = currentValue.filter((entry) => entry !== optionValue)
    if (value === undefined) setInternalValue(next)
    onValueChange?.(next)
  }
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
          multiple
          name={name}
          value={currentValue}
          required={required}
          disabled={disabled}
          items={options}
          onOpenChange={(open, eventDetails) => {
            setOpen(open)
            command.rootProps.onOpenChange(open, eventDetails)
          }}
          onValueChange={(next) => {
            if (value === undefined) setInternalValue(next)
            onValueChange?.(next)
          }}
        >
          <SelectTrigger
            ref={mergedTriggerRef}
            id={ids.controlId}
            icon={triggerIcon}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy(ids, { description, error, success }, ariaDescribedBy)}
            onKeyDown={(event) => {
              // Keyboard parity for the pointer-only chip control: the last
              // visible selection is removed with Backspace/Delete while the
              // popup is closed (inside the popup those keys stay Base UI's).
              if (open || !orderedSelection.length) return
              if (event.key !== "Backspace" && event.key !== "Delete") return
              event.preventDefault()
              removeValue(orderedSelection[orderedSelection.length - 1].value)
            }}
            className="peer pui:relative pui:aria-expanded:border-2 pui:aria-expanded:border-primary pui:[&>span[data-slot=select-value]]:flex pui:[&>span[data-slot=select-value]]:min-w-0 pui:[&>span[data-slot=select-value]]:flex-wrap pui:[&>span[data-slot=select-value]]:overflow-visible pui:[&>span[data-slot=select-value]]:whitespace-normal"
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
            <SelectValue placeholder=" " className="pui:gap-2">
              {(selected: string[]) =>
                selected.length
                  ? options
                      .filter((option) => selected.includes(option.value))
                      .map((option) => (
                        // The trigger is a single button: the chip control is a
                        // pointer removal (no nested button); keyboard removal
                        // is Backspace/Delete on the trigger and the option
                        // toggle inside the popup.
                        <InputChip
                          key={option.value}
                          data-slot="multi-select-chip"
                          pointerRemove
                          onRemove={() => removeValue(option.value)}
                        >
                          {option.label}
                        </InputChip>
                      ))
                  : null
              }
            </SelectValue>
          </SelectTrigger>
          {command.closeComplete ? null : (
            <SelectContent
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
                  <SelectOptionItem key={option.value} option={option} multiple />
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
          <FieldMessages ids={ids} description={description} error={error} success={success} />
        </div>
      ) : null}
    </div>
  )
}

export { MultiSelectField }
