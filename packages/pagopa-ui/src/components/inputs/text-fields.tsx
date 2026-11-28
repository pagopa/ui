"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useLocale, useMessages } from "@/lib/ui-provider"

import { Icon } from "@/components/icons/icon"
import { Default as CheckCircleIcon } from "@/components/icons/generated/check-circle"
import { Down as ChevronDownIcon, Up as ChevronUpIcon } from "@/components/icons/generated/chevron"
import { Default as EventIcon } from "@/components/icons/generated/event"
import { Default as ReportIcon } from "@/components/icons/generated/report"
import type { CalendarLocale } from "@/components/primitives/calendar"
import {
  OTPField,
  OTPFieldGroup,
  OTPFieldSlot,
  type OTPFieldProps,
} from "@/components/primitives/otp-field"
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
      data-slot="text-field"
      className={cn(
        "pui:grid",
        nativePicker
          ? "pui:gap-2"
          : error
            ? "pui:gap-0.5"
            : disabled
              ? "pui:gap-3.5"
              : "pui:gap-2.5 pui:has-[input:focus]:gap-3.5 pui:has-[input:not(:placeholder-shown)]:gap-3.5",
      )}
    >
      <div className="pui:relative">
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
            "peer pui:py-3 pui:text-label-sb",
            // The native editor keeps its browser-drawn value and hides the
            // empty placeholder text while the label rests (the label itself is
            // the placeholder then).
            nativePicker && !filled && "pui:not-focus:text-transparent",
            // The source frame insets the value 12px after a 24px leading icon
            // frame with an 8px gap (529:6102, 602:9439): 12 + 24 + 8 = 44.
            leadingIcon && "pui:pl-11",
            (trailingIcon || success || error) && "pui:pr-10",
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
              "pui:pointer-events-none pui:absolute pui:inset-y-0 pui:left-3 pui:flex pui:items-center pui:[&_svg:not(.pagopa-icon)]:size-6",
              nativePicker ? "pui:text-muted-foreground" : "pui:text-choice-icon",
            )}
          >
            {leadingIcon}
          </span>
        ) : null}
        {trailingIcon ? (
          <span
            aria-hidden="true"
            className="pui:pointer-events-none pui:absolute pui:inset-y-0 pui:right-3 pui:flex pui:items-center pui:text-muted-foreground pui:[&_svg:not(.pagopa-icon)]:size-6"
          >
            {trailingIcon}
          </span>
        ) : success && !error ? (
          <span
            aria-hidden="true"
            className="pui:pointer-events-none pui:absolute pui:inset-y-0 pui:right-3 pui:flex pui:items-center pui:text-success pui:[&_svg:not(.pagopa-icon)]:size-5"
          >
            <Icon source={CheckCircleIcon} size={20} />
          </span>
        ) : error ? (
          <span
            aria-hidden="true"
            className="pui:pointer-events-none pui:absolute pui:inset-y-0 pui:right-3 pui:flex pui:items-center pui:text-destructive pui:[&_svg:not(.pagopa-icon)]:size-5"
          >
            <Icon source={ReportIcon} size={20} />
          </span>
        ) : null}
      </div>
      {hasMessages ? (
        <div className={cn(!nativePicker && "pui:px-3.5")}>
          <FieldMessages
            ids={ids}
            description={description}
            error={error}
            errorIcon={nativePicker}
          />
        </div>
      ) : null}
      {success && !error ? (
        <p id={ids.successId} className="pui:sr-only">
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
    <div data-slot="textarea-field" className="pui:grid pui:gap-0.5">
      <div className="pui:relative">
        <Textarea
          id={ids.controlId}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy(ids, state, ariaDescribedBy)}
          placeholder=" "
          className={cn("peer pui:py-3 pui:text-label-sb", className)}
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
          restingClassName="pui:top-3 pui:translate-y-0"
        />
        {success && !error ? (
          <span
            aria-hidden="true"
            className="pui:pointer-events-none pui:absolute pui:top-3 pui:right-3 pui:flex pui:items-center pui:text-success pui:[&_svg:not(.pagopa-icon)]:size-5"
          >
            <Icon source={CheckCircleIcon} size={20} />
          </span>
        ) : error ? (
          <span
            aria-hidden="true"
            className="pui:pointer-events-none pui:absolute pui:top-3 pui:right-3 pui:flex pui:items-center pui:text-destructive pui:[&_svg:not(.pagopa-icon)]:size-5"
          >
            <Icon source={ReportIcon} size={20} />
          </span>
        ) : null}
      </div>
      <div className="pui:px-3.5">
        <FieldMessages ids={ids} description={description} error={error} />
      </div>
      {success && !error ? (
        <p id={ids.successId} className="pui:sr-only">
          {success}
        </p>
      ) : null}
    </div>
  )
}

// The mask prop sets the native `type="password"` on the slots; it is not
// cryptographic encryption. Defaults stay explicit (native label, 6 slots).
type AuthenticationCodeInputProps = Omit<OTPFieldProps, "length"> &
  Omit<FieldStateProps, "label"> & {
    /** Visible label of the group and of the first slot. @default messages.authenticationCodeInput.label */
    label?: React.ReactNode
    /** Number of slots rendered. @default 6 */
    length?: number
    /**
     * Announced name of a slot after the first, from its position: the caller
     * owns word order and grammar. @default messages.authenticationCodeInput.slotLabel
     */
    slotLabel?: (slot: { index: number; total: number }) => string
  }

function AuthenticationCodeInput({
  id,
  label: labelProp,
  description,
  error,
  success,
  required,
  requiredLabel,
  disabled,
  length = 6,
  slotLabel: slotLabelProp,
  className,
  "aria-describedby": ariaDescribedBy,
  ...props
}: AuthenticationCodeInputProps) {
  const t = useMessages("authenticationCodeInput")
  const label = labelProp ?? t.label
  const slotLabel = slotLabelProp ?? t.slotLabel

  const ids = useFieldIds(id)
  const state = { description, error, success }
  const invalid = Boolean(error) || undefined

  return (
    <div
      data-slot="authentication-code-input"
      className="pui:grid pui:min-w-0 pui:gap-1.5 pui:[overflow-wrap:anywhere]"
    >
      <FieldLabel
        htmlFor={ids.controlId}
        label={label}
        required={required}
        requiredLabel={requiredLabel}
        disabled={disabled}
      />
      <div className="pui:grid pui:min-w-0 pui:gap-0.5">
        <OTPField
          id={ids.controlId}
          length={length}
          required={required}
          disabled={disabled}
          className={cn("pui:gap-2", className)}
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

/**
 * Props of {@link DatePickerField}. `ref` points at the trigger while
 * `className` and the standard HTML attributes of a `div` land on the field's
 * root.
 *
 * The field's committed value is a local ISO date (`YYYY-MM-DD`) carried by a
 * named form control; `onValueChange` mirrors the committed value, not the
 * calendar's in-progress draft.
 */
type DatePickerFieldProps = FieldStateProps &
  Omit<React.ComponentProps<"div">, "children" | "className" | "ref"> & {
    /** Ref to the trigger, so a consumer can focus it or read it back. */
    ref?: React.Ref<HTMLButtonElement>
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
    /** BCP 47 locale of the field's own formatting (trigger value, panel caption and footer). @default the provider locale, "it-IT" at the root */
    locale?: string
    /** Day-grid locale of the shared Calendar. @default the provider calendar locale, Italian at the root */
    calendarLocale?: CalendarLocale
    /** Accessible name of the panel when `label` is not a plain string. @default messages.datePickerField.panelLabel */
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
  locale: localeProp,
  calendarLocale: calendarLocaleProp,
  panelLabel: panelLabelProp,
  selectionText,
  emptySelectionText,
  missingDateError,
  missingEndDateError,
  cancelLabel,
  confirmLabel,
  "aria-describedby": ariaDescribedBy,
  className,
  ref,
  leadingIcon = <Icon source={EventIcon} />,
  ...rootProps
}: DatePickerFieldProps) {
  const t = useMessages("datePickerField")
  const { locale: providerLocale, calendarLocale: providerCalendarLocale } = useLocale()
  const panelLabel = panelLabelProp ?? t.panelLabel
  const locale = localeProp ?? providerLocale
  const calendarLocale = calendarLocaleProp ?? providerCalendarLocale

  const ids = useFieldIds(id)
  const state = { description, error, success }
  const dateFieldFormat = React.useMemo(() => new Intl.DateTimeFormat(locale, ISO_DAY), [locale])
  const { inputRef: triggerRef, mergedInputRef: mergedTriggerRef } =
    useInputRef<HTMLButtonElement>(ref)
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
      ref={mergedTriggerRef}
      disabled={disabled}
      aria-labelledby={`${ids.controlId}-label`}
      // The invalid state is the field's contract and the outline selector
      // reads it; the APG dialog-trigger role is a plain button, which the
      // attribute rule does not model.
      // oxlint-disable-next-line jsx-a11y/role-supports-aria-props -- field state on the dialog trigger
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={describedBy(ids, state, ariaDescribedBy)}
      className="peer pui:flex pui:min-h-12 pui:w-full pui:items-center pui:gap-2 pui:rounded-lg pui:border pui:border-input pui:bg-background pui:px-3 pui:py-2 pui:text-left pui:text-body pui:transition-[color,background-color,border-color] pui:outline-none pui:select-none pui:focus-visible:border-ring pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-1 pui:focus-visible:outline-ring pui:disabled:cursor-not-allowed pui:disabled:bg-muted pui:disabled:text-muted-foreground pui:aria-invalid:border-destructive pui:aria-invalid:outline-destructive pui:aria-expanded:border-2 pui:aria-expanded:border-primary pui:[&_svg]:pointer-events-none pui:[&_svg]:shrink-0"
    >
      {leadingIcon ? (
        <span
          data-slot="date-picker-field-leading-icon"
          aria-hidden="true"
          inert
          className="pui:pointer-events-none pui:inline-flex pui:size-6 pui:shrink-0 pui:items-center pui:justify-center pui:text-choice-icon"
        >
          {leadingIcon}
        </span>
      ) : null}
      <span
        data-slot="date-picker-field-value"
        className="pui:flex-1 pui:truncate pui:text-label-sb"
      >
        {selected ? dateFieldFormat.format(selected) : null}
      </span>
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
    </button>
  )

  return (
    <div
      data-slot="date-picker-field"
      className={cn("pui:grid", error ? "pui:gap-0.5" : "pui:gap-2", className)}
      {...rootProps}
    >
      <div className="pui:relative">
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
              className="pui:w-auto pui:max-w-(--available-width) pui:gap-0 pui:bg-transparent pui:p-0 pui:shadow-none pui:data-open:animate-none pui:data-closed:animate-none"
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
          className="pui:sr-only"
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

export { AuthenticationCodeInput, DatePickerField, TextareaField, TextField }
export type {
  AuthenticationCodeInputProps,
  DatePickerFieldProps,
  TextareaFieldProps,
  TextFieldProps,
}
