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

import { InputChip } from "./chips"
import { FieldMessages, FloatingFieldLabel } from "./field"
import { describedBy, useFieldIds, useFormReset, type FieldStateProps } from "./field-utils"
import { useChoiceAction, type ChoiceAction } from "./choice-action"
import {
  ChoiceActionButton,
  SelectOptionItem,
  focusChoiceActionOnReverseTab,
  type SelectOption,
} from "./select-parts"

type MultiSelectFieldProps = FieldStateProps & {
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
  leadingIcon = <PagoPAIcon name="account_balance" size={24} />,
  className,
}: MultiSelectFieldProps) {
  const ids = useFieldIds(id)
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const [open, setOpen] = React.useState(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
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
            ref={triggerRef}
            id={ids.controlId}
            icon={triggerIcon}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy(ids, { description, error, success })}
            onKeyDown={(event) => {
              // Keyboard parity for the pointer-only chip control: the last
              // visible selection is removed with Backspace/Delete while the
              // popup is closed (inside the popup those keys stay Base UI's).
              if (open || !orderedSelection.length) return
              if (event.key !== "Backspace" && event.key !== "Delete") return
              event.preventDefault()
              removeValue(orderedSelection[orderedSelection.length - 1].value)
            }}
            className="peer relative aria-expanded:border-2 aria-expanded:border-primary [&>span[data-slot=select-value]]:flex [&>span[data-slot=select-value]]:min-w-0 [&>span[data-slot=select-value]]:flex-wrap [&>span[data-slot=select-value]]:overflow-visible [&>span[data-slot=select-value]]:whitespace-normal"
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
            <SelectValue placeholder=" " className="gap-2">
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
                          removeLabel={`Elimina ${option.label}`}
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
                    ? "p-0"
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
          className={open && filled ? "text-primary" : undefined}
        />
      </div>
      {description || error || success ? (
        <div className="px-3.5">
          <FieldMessages ids={ids} description={description} error={error} success={success} />
        </div>
      ) : null}
    </div>
  )
}

export { MultiSelectField }
