import { useRef, useState, type ComponentProps } from "react"
import { cn } from "@/lib/cn"
import type { DateRange } from "@/components/primitives/calendar"

import { Button } from "@/components/primitives/button"
import { Calendar } from "@/components/primitives/calendar"
import { Separator } from "@/components/primitives/separator"
import { FieldMessages } from "./field"
import { useFieldIds } from "./field-utils"

interface DatePickerRange {
  from: Date
  to: Date
}

type DatePickerProps = {
  label?: string
  onCancel: () => void
  today?: Date
  className?: string
  /** BCP 47 locale of the panel's own formatting (weekday names, footer, caption). @default "it-IT" */
  locale?: string
  /** Day-grid locale of the shared Calendar (a react-day-picker `Locale`); the default stays Italian. */
  calendarLocale?: ComponentProps<typeof Calendar>["locale"]
  /**
   * Complete footer line of the panel, from the formatted date: the caller
   * owns the phrase. @default built-in Italian "Selezione: {date}"
   */
  selectionText?: (formattedDate: string) => string
  /** Footer line with nothing selected. @default "Nessuna data selezionata" */
  emptySelectionText?: string
  /** Validation message of a single date confirmed empty. @default "Seleziona una data prima di salvare." */
  missingDateError?: string
  /** Validation message of an unfinished range. @default "Seleziona la data di fine prima di salvare." */
  missingEndDateError?: string
  /** Panel cancel action text. @default "Annulla" */
  cancelLabel?: string
  /** Panel confirm action text. @default "Salva" */
  confirmLabel?: string
} & (
  | { mode?: "single"; value?: Date; onConfirm: (value: Date) => void }
  | { mode: "range"; value?: DatePickerRange; onConfirm: (value: DatePickerRange) => void }
)

function DatePicker(props: DatePickerProps) {
  const {
    label = "Seleziona data",
    onCancel,
    today,
    className,
    locale = "it-IT",
    calendarLocale,
    selectionText = (formattedDate) => `Selezione: ${formattedDate}`,
    emptySelectionText = "Nessuna data selezionata",
    missingDateError = "Seleziona una data prima di salvare.",
    missingEndDateError = "Seleziona la data di fine prima di salvare.",
    cancelLabel = "Annulla",
    confirmLabel = "Salva",
  } = props
  const ids = useFieldIds()
  const root = useRef<HTMLFieldSetElement>(null)
  const value =
    props.mode === "range"
      ? props.value
      : props.value
        ? { from: props.value, to: props.value }
        : undefined
  const valueKey = `${props.mode ?? "single"}:${value?.from.getTime()}:${value?.to.getTime()}`
  const [defaultMonth] = useState(() => new Date())
  const [selection, setSelection] = useState<{
    key: string
    range: DateRange | undefined
    month: Date
    error: string
  }>(() => ({
    key: valueKey,
    range: value,
    month: value?.from ?? today ?? defaultMonth,
    error: "",
  }))
  const current =
    selection.key === valueKey
      ? selection
      : { key: valueKey, range: value, month: value?.from ?? today ?? defaultMonth, error: "" }
  if (selection.key !== valueKey) setSelection(current)
  const { error } = current
  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
  const from = current.range?.from
  const to = current.range?.to
  const formattedDate = from
    ? props.mode === "range" && to
      ? `${dateFormat.format(from)} - ${dateFormat.format(to)}`
      : dateFormat.format(from)
    : undefined

  function selectRange(range: DateRange | undefined) {
    setSelection({ ...current, range, error: "" })
  }

  const calendarProps = {
    month: current.month,
    today,
    locale: calendarLocale,
    onMonthChange: (month: Date) => setSelection({ ...current, month }),
    formatters: {
      formatCaption: (month: Date) =>
        formattedDate &&
        from?.getMonth() === month.getMonth() &&
        from.getFullYear() === month.getFullYear()
          ? formattedDate
          : month.toLocaleDateString(locale, { month: "long", year: "numeric" }),
    },
    footer: formattedDate ? selectionText(formattedDate) : emptySelectionText,
  }

  function reportError(message: string) {
    setSelection({ ...current, error: message })
    root.current?.querySelector<HTMLButtonElement>('[role="grid"] button[tabindex="0"]')?.focus()
  }

  return (
    <fieldset
      ref={root}
      aria-invalid={Boolean(error) || undefined}
      aria-describedby={error ? ids.errorId : undefined}
      aria-labelledby={`${ids.controlId}-label`}
      className={cn(
        "flex min-w-0 w-full max-w-85 flex-col gap-2 rounded-2xl bg-card shadow-32",
        className,
      )}
    >
      {/* The source header stacks its label row and its month row directly (8049:39382,
          8258:45660), then a full-bleed divider. The stack gap buys the label row's
          8px bottom inset so the month row starts at the source's 44. The label is a
          plain child, not the fieldset's rendered legend, so it stays inside the card
          in every engine. */}
      <div
        id={`${ids.controlId}-label`}
        className="px-4 pt-4 text-label-mini text-muted-foreground"
      >
        {label}
      </div>
      <div className="flex flex-col gap-2">
        {props.mode === "range" ? (
          <Calendar
            {...calendarProps}
            mode="range"
            required
            resetOnSelect
            selected={current.range}
            onSelect={selectRange}
          />
        ) : (
          <Calendar
            {...calendarProps}
            mode="single"
            required
            selected={from}
            onSelect={(date) => selectRange({ from: date, to: date })}
          />
        )}
        {error ? (
          <div className="px-4">
            <FieldMessages ids={ids} error={error} />
          </div>
        ) : null}
      </div>
      <Separator />
      <div className="flex items-center justify-end gap-6 px-4 pt-2 pb-4">
        <Button
          type="button"
          variant="ghost"
          // Source action: a 16/22 text action 22px tall, not a 48px control.
          // The pointer target comes from the invisible ::after expansion.
          className="relative min-h-0 border-0 px-0 py-0 after:absolute after:inset-x-0 after:-inset-y-3"
          onClick={() => {
            setSelection({
              key: valueKey,
              range: value,
              month: value?.from ?? today ?? new Date(),
              error: "",
            })
            onCancel()
          }}
        >
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="relative min-h-0 border-0 px-0 py-0 after:absolute after:inset-x-0 after:-inset-y-3"
          onClick={() => {
            if (!from) {
              reportError(missingDateError)
              return
            }
            if (props.mode === "range") {
              if (!to) {
                reportError(missingEndDateError)
                return
              }
              props.onConfirm({ from, to })
              return
            }
            props.onConfirm(from)
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </fieldset>
  )
}

export { DatePicker, type DatePickerProps, type DatePickerRange }
