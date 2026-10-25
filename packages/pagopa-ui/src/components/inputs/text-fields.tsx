import * as React from "react"
import { cn } from "@/lib/cn"
import { CalendarDays } from "@/components/primitives/icons"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import type { Calendar } from "@/components/primitives/calendar"
import { OTPField, OTPFieldGroup, OTPFieldSlot } from "@/components/primitives/otp-field"
import { Input } from "@/components/primitives/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/primitives/popover"
import { Textarea } from "@/components/primitives/textarea"

import { DatePicker } from "./date-picker"
import { FieldLabel, FieldMessages, FloatingFieldLabel } from "./field"
import {
  describedBy,
  useFieldIds,
  useFormReset,
  useInputRef,
  type FieldStateProps,
} from "./field-utils"

// Native pickers render their own inline value/placeholder and their
// `:placeholder-shown` never matches, so the label keeps the source floating
// pattern while the filled state is tracked in React and the browser's empty
// text stays hidden until the field is focused.
const NATIVE_PICKER_TYPES = new Set(["date", "time", "datetime-local", "month", "week"])

function hasNativeEditorValue(value: React.ComponentProps<"input">["value"]) {
  return value != null && String(value) !== ""
}

// The field contract is the shared `FieldStateProps`; `placeholder` is
// reserved for the floating label and `size` would break the 48px control.
type TextFieldProps = Omit<React.ComponentProps<typeof Input>, "size" | "placeholder"> &
  FieldStateProps & {
    /** Decorative icon before the value. */
    leadingIcon?: React.ReactNode
    /** Decorative icon after the value. */
    trailingIcon?: React.ReactNode
  }

function TextField({
  id,
  label,
  description,
  error,
  success,
  required,
  requiredLabel,
  disabled,
  leadingIcon,
  trailingIcon,
  className,
  "aria-describedby": ariaDescribedBy,
  ref,
  type,
  value,
  defaultValue,
  onChange,
  ...props
}: TextFieldProps) {
  const ids = useFieldIds(id)
  const state = { description, error, success }
  const nativePicker = NATIVE_PICKER_TYPES.has(type ?? "")
  const hasMessages = Boolean(description || error)
  const { inputRef, mergedInputRef } = useInputRef(ref)
  const [pickerFilled, setPickerFilled] = React.useState(() =>
    hasNativeEditorValue(value ?? defaultValue),
  )
  useFormReset(inputRef, () => setPickerFilled(hasNativeEditorValue(inputRef.current?.value)))
  const filled = value === undefined ? pickerFilled : hasNativeEditorValue(value)

  return (
    <div
      className={cn(
        "grid",
        nativePicker
          ? "gap-2"
          : error
            ? "gap-0.5"
            : disabled
              ? "gap-3.5"
              : "gap-2.5 has-[input:focus]:gap-3.5 has-[input:not(:placeholder-shown)]:gap-3.5",
      )}
    >
      <div className="relative">
        <Input
          ref={mergedInputRef}
          id={ids.controlId}
          type={type}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy(ids, state, ariaDescribedBy)}
          placeholder={nativePicker ? undefined : " "}
          onChange={(event) => {
            if (nativePicker) setPickerFilled(hasNativeEditorValue(event.currentTarget.value))
            onChange?.(event)
          }}
          value={value}
          defaultValue={defaultValue}
          className={cn(
            "peer py-3 text-label-sb",
            // The native editor keeps its browser-drawn value and hides the
            // empty placeholder text while the label rests (the label itself is
            // the placeholder then).
            nativePicker && !filled && "not-focus:text-transparent",
            // The source frame insets the value 12px after a 24px leading icon
            // frame with an 8px gap (529:6102, 602:9439): 12 + 24 + 8 = 44.
            leadingIcon && "pl-11",
            (trailingIcon || success || error) && "pr-10",
            className,
          )}
          {...props}
        />
        <FloatingFieldLabel
          htmlFor={ids.controlId}
          label={label}
          required={required}
          requiredLabel={requiredLabel}
          floated={nativePicker ? filled : undefined}
          placeholderValue={!nativePicker}
          leadingIcon={leadingIcon}
        />
        {leadingIcon ? (
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-y-0 left-3 flex items-center [&_svg]:size-6",
              nativePicker ? "text-muted-foreground" : "text-choice-icon",
            )}
          >
            {leadingIcon}
          </span>
        ) : null}
        {trailingIcon ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground [&_svg]:size-6"
          >
            {trailingIcon}
          </span>
        ) : success && !error ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-success [&_svg]:size-5"
          >
            <PagoPAIcon name="check_circle" />
          </span>
        ) : error ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-destructive [&_svg]:size-5"
          >
            <PagoPAIcon name="report" />
          </span>
        ) : null}
      </div>
      {hasMessages ? (
        <div className={cn(!nativePicker && "px-3.5")}>
          <FieldMessages
            ids={ids}
            description={description}
            error={error}
            errorIcon={nativePicker}
          />
        </div>
      ) : null}
      {success && !error ? (
        <p id={ids.successId} className="sr-only">
          {success}
        </p>
      ) : null}
    </div>
  )
}

type TextareaFieldProps = React.ComponentProps<typeof Textarea> & FieldStateProps

/**
 * Multiline text field: label, description, validation messages and the
 * caller-owned character count around the native textarea.
 *
 * Figma: TextArea (node 10585:80643)
 */
function TextareaField({
  id,
  label,
  description,
  error,
  success,
  required,
  requiredLabel,
  disabled,
  className,
  "aria-describedby": ariaDescribedBy,
  ...props
}: TextareaFieldProps) {
  const ids = useFieldIds(id)
  const state = { description, error, success }

  return (
    <div className="grid gap-0.5">
      <div className="relative">
        <Textarea
          id={ids.controlId}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy(ids, state, ariaDescribedBy)}
          placeholder=" "
          className={cn("peer py-3 text-label-sb", className)}
          {...props}
        />
        <FloatingFieldLabel
          htmlFor={ids.controlId}
          label={label}
          required={required}
          requiredLabel={requiredLabel}
          // The source textarea label is inset 12px from the frame (10585:80647)
          // instead of centring, and floats to the same notch once focused or
          // filled.
          restingClassName="top-3 translate-y-0"
        />
        {success && !error ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-3 right-3 flex items-center text-success [&_svg]:size-5"
          >
            <PagoPAIcon name="check_circle" />
          </span>
        ) : error ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-3 right-3 flex items-center text-destructive [&_svg]:size-5"
          >
            <PagoPAIcon name="report" />
          </span>
        ) : null}
      </div>
      <div className="px-3.5">
        <FieldMessages ids={ids} description={description} error={error} />
      </div>
      {success && !error ? (
        <p id={ids.successId} className="sr-only">
          {success}
        </p>
      ) : null}
    </div>
  )
}

// The mask prop sets the native `type="password"` on the slots; it is not
// cryptographic encryption. Defaults stay explicit (native label, 6 slots).
type AuthenticationCodeInputProps = Omit<React.ComponentProps<typeof OTPField>, "length"> &
  Omit<FieldStateProps, "label"> & {
    /** Visible label of the group and of the first slot. @default "Codice di autenticazione" */
    label?: React.ReactNode
    /** Number of slots rendered. @default 6 */
    length?: number
    /**
     * Announced name of a slot after the first, from its position: the caller
     * owns word order and grammar. @default ({ index, total }) => `Carattere N di M`
     */
    slotLabel?: (slot: { index: number; total: number }) => string
  }

function AuthenticationCodeInput({
  id,
  label = "Codice di autenticazione",
  description,
  error,
  success,
  required,
  requiredLabel,
  disabled,
  length = 6,
  slotLabel = ({ index, total }) => `Carattere ${index + 1} di ${total}`,
  className,
  "aria-describedby": ariaDescribedBy,
  ...props
}: AuthenticationCodeInputProps) {
  const ids = useFieldIds(id)
  const state = { description, error, success }
  const invalid = Boolean(error) || undefined

  return (
    <div className="grid min-w-0 gap-1.5 [overflow-wrap:anywhere]">
      <FieldLabel
        htmlFor={ids.controlId}
        label={label}
        required={required}
        requiredLabel={requiredLabel}
        disabled={disabled}
      />
      <div className="grid min-w-0 gap-0.5">
        <OTPField
          id={ids.controlId}
          length={length}
          required={required}
          disabled={disabled}
          className={cn("gap-2", className)}
          {...props}
        >
          <OTPFieldGroup>
            {Array.from({ length }, (_, index) => (
              <OTPFieldSlot
                key={index}
                index={index}
                aria-invalid={invalid}
                // The native label already names the first slot; the remaining
                // slots announce their position so the field keeps one identity.
                aria-label={index === 0 ? undefined : slotLabel({ index, total: length })}
                aria-describedby={
                  index === 0 ? describedBy(ids, state, ariaDescribedBy) : undefined
                }
              />
            ))}
          </OTPFieldGroup>
        </OTPField>
        <FieldMessages ids={ids} {...state} />
      </div>
    </div>
  )
}

// The field contract stays the native one: a local ISO date (`YYYY-MM-DD`),
// never a UTC instant, carried by a named form control. The interface is the
// custom DatePicker panel instead of the browser's picker.
const ISO_DAY = { day: "numeric", month: "short", year: "numeric" } as const

function parseLocalIsoDate(value: string | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "")
  if (!match) return undefined
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (Number.isNaN(date.getTime())) return undefined
  // An impossible date (2026-02-31) rolls over in the Date constructor: the
  // round trip keeps the native contract, where such a value is simply empty.
  return toLocalIsoDate(date) === value ? date : undefined
}

function toLocalIsoDate(date: Date) {
  const pad = (part: number) => String(part).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// The field's committed value is a local ISO date (`YYYY-MM-DD`) carried by a
// named form control; `onValueChange` mirrors the committed value, not the
// calendar's in-progress draft.
type DatePickerFieldProps = FieldStateProps & {
  /** Id applied to the trigger, so an external label can target it; generated when omitted. */
  id?: string
  /** Keeps the value and the form control without opening the panel. */
  readOnly?: boolean
  /** Name of the hidden native field that owns the form value. */
  name?: string
  /** Controlled ISO (`YYYY-MM-DD`) value. */
  value?: string
  /** Initial ISO (`YYYY-MM-DD`) value for the uncontrolled field. @default "" */
  defaultValue?: string
  /** Called with the committed ISO value after Salva. */
  onValueChange?: (value: string) => void
  /** Reference day highlighted as today in the panel. */
  today?: Date
  /** BCP 47 locale of the field's own formatting (trigger value, panel caption and footer). @default "it-IT" */
  locale?: string
  /** Day-grid locale of the shared Calendar (a react-day-picker `Locale`); the default stays Italian. */
  calendarLocale?: React.ComponentProps<typeof Calendar>["locale"]
  /** Accessible name of the panel when `label` is not a plain string. @default "Seleziona data" */
  panelLabel?: string
  /**
   * Complete footer line of the panel, from the formatted date: the caller
   * owns the phrase. @default built-in Italian "Selezione: {date}"
   */
  selectionText?: (formattedDate: string) => string
  /** Panel footer line with nothing selected. @default "Nessuna data selezionata" */
  emptySelectionText?: string
  /** Validation message of a single date confirmed empty. @default "Seleziona una data prima di salvare." */
  missingDateError?: string
  /** Validation message of an unfinished range. @default "Seleziona la data di fine prima di salvare." */
  missingEndDateError?: string
  /** Panel cancel action text. @default "Annulla" */
  cancelLabel?: string
  /** Panel confirm action text. @default "Salva" */
  confirmLabel?: string
  /** ClassName applied to the field's root grid. */
  className?: string
  /** Icon shown with the value; pass `null` to remove the default icon. */
  leadingIcon?: React.ReactNode
}

function DatePickerField({
  id,
  label,
  description,
  error,
  success,
  required,
  requiredLabel,
  disabled,
  readOnly,
  name,
  value,
  defaultValue = "",
  onValueChange,
  today,
  locale = "it-IT",
  calendarLocale,
  panelLabel = "Seleziona data",
  selectionText,
  emptySelectionText,
  missingDateError,
  missingEndDateError,
  cancelLabel,
  confirmLabel,
  className,
  leadingIcon = <CalendarDays />,
}: DatePickerFieldProps) {
  const ids = useFieldIds(id)
  const state = { description, error, success }
  const dateFieldFormat = React.useMemo(() => new Intl.DateTimeFormat(locale, ISO_DAY), [locale])
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const [open, setOpen] = React.useState(false)
  useFormReset(triggerRef, () => {
    if (value === undefined) setInternalValue(defaultValue)
  })
  const currentValue = value ?? internalValue
  const selected = parseLocalIsoDate(currentValue)
  const filled = Boolean(selected)
  const trigger = (
    <button
      type="button"
      id={ids.controlId}
      ref={triggerRef}
      disabled={disabled}
      aria-labelledby={`${ids.controlId}-label`}
      // The invalid state is the field's contract and the outline selector
      // reads it; the APG dialog-trigger role is a plain button, which the
      // attribute rule does not model.
      // oxlint-disable-next-line jsx-a11y/role-supports-aria-props -- field state on the dialog trigger
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={describedBy(ids, state)}
      className={cn(
        "peer flex min-h-12 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-left text-body transition-[color,background-color,border-color] outline-none select-none focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive aria-invalid:outline-destructive aria-expanded:border-2 aria-expanded:border-primary [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
    >
      {leadingIcon ? (
        <span
          data-slot="date-picker-field-leading-icon"
          aria-hidden="true"
          inert
          className="pointer-events-none inline-flex size-6 shrink-0 items-center justify-center text-choice-icon"
        >
          {leadingIcon}
        </span>
      ) : null}
      <span data-slot="date-picker-field-value" className="flex-1 truncate text-label-sb">
        {selected ? dateFieldFormat.format(selected) : null}
      </span>
      <PagoPAIcon
        name="chevron"
        variant={open ? "up" : "down"}
        size={24}
        className={
          disabled ? "text-muted-foreground" : open || error ? "text-primary" : "text-foreground"
        }
      />
    </button>
  )

  return (
    <div className={cn("grid", error ? "gap-0.5" : "gap-2")}>
      <div className="relative">
        {readOnly ? (
          // A read-only chooser keeps the committed value and its form control
          // but is not a popup trigger: no dialog semantics, no panel.
          trigger
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger render={trigger} />
            <PopoverContent
              align="start"
              sideOffset={4}
              // The panel is the field's dialog: it takes the field's name so
              // the calendar is announced in context, not as an unnamed dialog.
              aria-label={typeof label === "string" && label ? label : panelLabel}
              // The field's panel is laid out and visible in the frame it opens:
              // no mount transition (which would delay visibility and the
              // unmount after Salva/Annulla) and no motion a reduced-motion
              // user would still see.
              className="w-auto max-w-(--available-width) gap-0 bg-transparent p-0 shadow-none data-open:animate-none data-closed:animate-none"
            >
              <DatePicker
                value={selected}
                today={today}
                locale={locale}
                calendarLocale={calendarLocale}
                selectionText={selectionText}
                emptySelectionText={emptySelectionText}
                missingDateError={missingDateError}
                missingEndDateError={missingEndDateError}
                cancelLabel={cancelLabel}
                confirmLabel={confirmLabel}
                onCancel={() => setOpen(false)}
                onConfirm={(nextValue) => {
                  const nextIso = toLocalIsoDate(nextValue)
                  if (value === undefined) setInternalValue(nextIso)
                  setOpen(false)
                  onValueChange?.(nextIso)
                }}
              />
            </PopoverContent>
          </Popover>
        )}
        <FloatingFieldLabel
          id={`${ids.controlId}-label`}
          htmlFor={ids.controlId}
          label={label}
          required={required}
          requiredLabel={requiredLabel}
          // The label floats while the field has a value, while the trigger is
          // focused (CSS) and while the panel is open (focus lives in the panel).
          floated={filled || open}
          placeholderValue={false}
          leadingIcon={Boolean(leadingIcon)}
        />
        <input
          type="text"
          name={name}
          value={currentValue}
          required={required}
          disabled={disabled}
          onChange={() => undefined}
          onFocus={() => triggerRef.current?.focus()}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
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

export { AuthenticationCodeInput, DatePickerField, TextareaField, TextField }
