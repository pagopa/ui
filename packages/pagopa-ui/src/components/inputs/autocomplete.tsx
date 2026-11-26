"use client"

import * as React from "react"
import { Combobox } from "@/components/primitives/combobox"
import { cn } from "@/lib/cn"
import { useMessages, usePortalHost } from "@/lib/ui-provider"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

import { Input } from "@/components/primitives/input"

import { InputChip } from "./chips"
import { FieldMessages, FloatingFieldLabel } from "./field"
import { describedBy, useFieldIds, useFormReset, type FieldStateProps } from "./field-utils"
import { ItemRow, type ItemRowContent } from "./item-row"

type AutocompleteOption = ItemRowContent & {
  value: string
  disabled?: boolean
}

const defaultLeadingIcon = <PagoPAIcon name="account_balance" size={24} aria-hidden="true" />

const defaultListLabel = (label: string) => (label ? `Lista ${label}` : "Lista")
const defaultSelectedLabel = (values: string[]) => `hai selezionato ${values.join(", ")}`

/** Normalises the single (`string`) and multiple (`string[]`) selections. */
const toSelection = (value: string | string[] | null | undefined): string[] =>
  value === undefined || value === null ? [] : Array.isArray(value) ? value : value ? [value] : []

export interface AutocompleteSharedProps extends FieldStateProps {
  id?: string
  options: AutocompleteOption[]
  name?: string
  /** Announced and shown text when no option matches. @default messages.autocomplete.emptyLabel */
  emptyLabel?: string
  /** Decorative artwork before the value; pass `null` to remove it. */
  leadingIcon?: React.ReactNode
  /** Accessible name of the clear control. @default messages.autocomplete.clearLabel */
  clearLabel?: string
  /** Sentence read in place of the count badge. @default messages.autocomplete.counterLabel */
  counterLabel?: (count: number) => string
  /** Accessible name of the control that removes one value. @default messages.autocomplete.removeValueLabel */
  removeValueLabel?: (value: string) => string
  /** Accessible name of the badge control that empties the selection. @default messages.autocomplete.clearAllLabel */
  clearAllLabel?: string
  /** Accessible name of the trigger that opens the list. @default messages.autocomplete.openLabel */
  openLabel?: string
  /** Accessible name of the trigger that closes the list. @default messages.autocomplete.closeLabel */
  closeLabel?: string
  /** Accessible name of the list, from the field label. @default "Lista {label}" */
  listLabel?: (label: string) => string
  /** Announcement after a choice, from the selected values. @default "hai selezionato {values}" */
  selectedLabel?: (values: string[]) => string
  /** Announces that the options are being loaded. @default false */
  loading?: boolean
  /** Announced loading text. @default messages.autocomplete.loadingLabel */
  loadingLabel?: string
  /** Invitation to search, shown while the input is empty; the label stays. */
  placeholder?: string
  /**
   * Label of the row that toggles every listed option; only the multiple field
   * draws it, and it is drawn only when this is passed.
   */
  selectAllLabel?: string
  className?: string
}

type AutocompleteProps = AutocompleteSharedProps &
  (
    | {
        /** Chooses one value, the field's Default source type. */
        multiple?: false
        value?: string
        defaultValue?: string
        onValueChange?: (value: string) => void
      }
    | {
        /** Keeps several values as chips, the source Multiselect and counter types. */
        multiple: true
        /**
         * Draws every value as its own removable chip, or collapses two or more
         * into a count badge that carries the clear control.
         * @default "chips"
         */
        multipleDisplay?: "chips" | "counter"
        value?: string[]
        defaultValue?: string[]
        onValueChange?: (value: string[]) => void
      }
  )

function Autocomplete(props: AutocompleteProps) {
  // The union stays whole on `props` so `multiple` discriminates the value and
  // the change callback at the call site.
  const {
    id,
    label,
    options,
    multiple = false,
    value,
    defaultValue,
    description,
    error,
    success,
    required,
    requiredLabel,
    disabled,
    name,
    emptyLabel: emptyLabelProp,
    leadingIcon = defaultLeadingIcon,
    clearLabel: clearLabelProp,
    counterLabel: counterLabelProp,
    removeValueLabel: removeValueLabelProp,
    clearAllLabel: clearAllLabelProp,
    openLabel: openLabelProp,
    closeLabel: closeLabelProp,
    listLabel = defaultListLabel,
    selectedLabel = defaultSelectedLabel,
    loading = false,
    loadingLabel: loadingLabelProp,
    placeholder,
    selectAllLabel,
    className,
  } = props
  const t = useMessages("autocomplete")
  const emptyLabel = emptyLabelProp ?? t.emptyLabel
  const clearLabel = clearLabelProp ?? t.clearLabel
  const counterLabel = counterLabelProp ?? t.counterLabel
  const removeValueLabel = removeValueLabelProp ?? t.removeValueLabel
  const clearAllLabel = clearAllLabelProp ?? t.clearAllLabel
  const openLabel = openLabelProp ?? t.openLabel
  const closeLabel = closeLabelProp ?? t.closeLabel
  const loadingLabel = loadingLabelProp ?? t.loadingLabel

  const ids = useFieldIds(id)
  const portalHost = usePortalHost()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [internalSelection, setInternalSelection] = React.useState(() => toSelection(defaultValue))
  const [inputValue, setInputValue] = React.useState(
    typeof defaultValue === "string" ? defaultValue : "",
  )
  const [open, setOpen] = React.useState(false)
  const [focused, setFocused] = React.useState(false)
  const [announcement, setAnnouncement] = React.useState("")
  useFormReset(inputRef, () => {
    if (value === undefined) setInternalSelection(toSelection(defaultValue))
  })
  const items = React.useMemo(
    () =>
      Combobox.createItems(options, {
        getValue: (option) => option.value,
        getLabel: (option) => option.label,
      }),
    [options],
  )
  const selection = value === undefined ? internalSelection : toSelection(value)
  const filled = Boolean(selection.length || inputValue)
  const labelText = typeof label === "string" ? label : ""
  const listName = listLabel(labelText)
  const statusText = loading ? loadingLabel : announcement
  const labelsOf = React.useCallback(
    (values: string[]) =>
      values.map((entry) => {
        const option = options.find((candidate) => candidate.value === entry)
        return option && typeof option.label === "string" ? option.label : entry
      }),
    [options],
  )
  // One callback feeds both modes; the selection shape is the only difference.
  const commit = (next: string[]) => {
    if (value === undefined) setInternalSelection(next)
    // `multiple` discriminates the callback: a list or the first value.
    if (props.multiple) props.onValueChange?.(next)
    else props.onValueChange?.(next[0] ?? "")
    const announced = labelsOf(next)
    setAnnouncement(announced.length ? selectedLabel(announced) : "")
  }
  // The source draws two types of the same field: `Type=Multiselect` keeps a
  // removable pill per value, `Type=Multiselect counter` collapses two or more
  // values into a badge whose own control clears them all (824:8872,
  // 11073:2423). A single value is never a count of one, so it keeps its name.
  const collapsed =
    props.multiple && (props.multipleDisplay ?? "chips") === "counter" && selection.length > 1
  // The badge carries the clear control, so the action group is the arrow alone
  // there and `[clear][chevron]` everywhere else.
  const showClear = multiple ? selection.length > 0 && !collapsed : filled
  const selectableOptions = options.filter((option) => !option.disabled)
  const allListedSelected =
    selectableOptions.length > 0 &&
    selectableOptions.every((option) => selection.includes(option.value))

  return (
    <Combobox.Root
      items={items}
      name={name}
      multiple={multiple}
      value={multiple ? selection : (selection[0] ?? null)}
      required={required}
      disabled={disabled}
      autoComplete="off"
      onOpenChange={setOpen}
      onInputValueChange={(next) => setInputValue(next)}
      onValueChange={(next) => commit(toSelection(next))}
    >
      <div className={cn("pui:grid pui:min-w-0 pui:gap-2", className)}>
        <Combobox.InputGroup data-slot="autocomplete" className="pui:relative pui:min-w-0">
          {leadingIcon ? (
            <span
              aria-hidden="true"
              data-slot="autocomplete-leading-icon"
              className="pui:pointer-events-none pui:absolute pui:inset-y-0 pui:left-3 pui:flex pui:items-center pui:text-choice-icon pui:[&_svg]:size-6"
            >
              {leadingIcon}
            </span>
          ) : null}
          {multiple ? (
            // The chips row owns the field frame: the input is a flex sibling of
            // the chips so the cursor sits after the last chip (616:3865).
            <div
              data-slot="autocomplete-multiple"
              className={cn(
                "pui:flex pui:min-h-12 pui:min-w-0 pui:flex-nowrap pui:items-center pui:gap-2 pui:rounded-lg pui:border pui:border-input pui:bg-background pui:py-2 pui:pr-3 pui:pl-3 pui:transition-[color,background-color,border-color]",
                leadingIcon && "pui:pl-11",
                focused &&
                  !error &&
                  "pui:border-ring pui:outline-2 pui:outline-offset-1 pui:outline-ring",
                error && "pui:border-destructive",
                disabled && "pui:bg-muted pui:text-muted-foreground",
              )}
            >
              <div
                data-slot="autocomplete-multiple-chips"
                className="pui:flex pui:min-w-0 pui:shrink pui:items-center pui:gap-2 pui:overflow-x-auto"
              >
                <Combobox.Value>
                  {(selectedValues: string[]) => {
                    const values = selectedValues ?? []
                    if (collapsed) {
                      return (
                        <InputChip
                          data-slot="autocomplete-counter"
                          className="pui:shrink-0"
                          removeLabel={clearAllLabel}
                          onRemove={disabled ? undefined : () => commit([])}
                        >
                          <span aria-hidden="true">{values.length}</span>
                          <span className="pui:sr-only">{counterLabel(values.length)}</span>
                        </InputChip>
                      )
                    }
                    return values.map((entry, index) => {
                      const text = labelsOf([entry])[0] ?? entry
                      return (
                        <InputChip
                          key={`${entry}-${index}`}
                          className="pui:max-w-full pui:shrink-0"
                          removeLabel={removeValueLabel(text)}
                          onRemove={
                            disabled
                              ? undefined
                              : () => commit(selection.filter((v) => v !== entry))
                          }
                        >
                          {text}
                        </InputChip>
                      )
                    })
                  }}
                </Combobox.Value>
              </div>
              <Combobox.Input
                ref={inputRef}
                id={ids.controlId}
                placeholder={placeholder ?? " "}
                aria-invalid={Boolean(error) || undefined}
                aria-describedby={describedBy(ids, { description, error, success })}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(event) => {
                  // Backspace on an empty input removes the last value, the
                  // native combobox path next to each chip's own control.
                  if (event.key !== "Backspace" || inputValue || disabled) return
                  if (!selection.length) return
                  event.preventDefault()
                  commit(selection.slice(0, -1))
                }}
                render={
                  <Input
                    className={cn(
                      "peer pui:min-h-6 pui:min-w-6 pui:flex-1 pui:border-0 pui:bg-transparent pui:p-0 pui:text-label-sb pui:focus-visible:outline-none",
                      disabled && "pui:bg-transparent pui:text-muted-foreground",
                    )}
                  />
                }
              />
              {disabled ? null : (
                // The source `Active` row puts the `48x24 Action goup` after the
                // chips and the caret target, inside the frame: a flex sibling
                // keeps the row on the source's 12px inset.
                <span
                  data-slot="autocomplete-actions"
                  className="pui:flex pui:shrink-0 pui:items-center"
                >
                  {showClear ? (
                    <Combobox.Clear
                      aria-label={clearLabel}
                      tabIndex={0}
                      className="pui:relative pui:grid pui:size-6 pui:place-items-center pui:rounded-sm pui:text-foreground pui:outline-none pui:after:absolute pui:after:-inset-2.5 pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-1 pui:focus-visible:outline-ring"
                    >
                      <PagoPAIcon name="close" size={24} variant="small" aria-hidden="true" />
                    </Combobox.Clear>
                  ) : null}
                  <Combobox.Trigger
                    aria-label={open ? closeLabel : openLabel}
                    className="pui:relative pui:grid pui:size-6 pui:place-items-center pui:rounded-sm pui:text-foreground pui:outline-none pui:after:absolute pui:after:-inset-2.5 pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-1 pui:focus-visible:outline-ring"
                  >
                    <PagoPAIcon
                      name="chevron"
                      variant={open ? "up" : "down"}
                      size={24}
                      aria-hidden="true"
                    />
                  </Combobox.Trigger>
                </span>
              )}
            </div>
          ) : (
            <Combobox.Input
              ref={inputRef}
              id={ids.controlId}
              placeholder={placeholder ?? " "}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={describedBy(ids, { description, error, success })}
              render={
                <Input
                  className={cn(
                    "peer pui:py-3 pui:pr-10 pui:text-label-sb",
                    leadingIcon && "pui:pl-11",
                  )}
                />
              }
            />
          )}
          <FloatingFieldLabel
            id={`${ids.controlId}-label`}
            htmlFor={ids.controlId}
            label={label}
            required={required}
            requiredLabel={requiredLabel}
            leadingIcon={Boolean(leadingIcon)}
            // The chips wrapper sits between the input and the label, so the
            // multiple field drives the float from state instead of `peer`.
            floated={multiple ? filled || focused : undefined}
            focusDriven={!multiple}
            placeholderValue={!multiple}
          />
          {disabled ? (
            <PagoPAIcon
              name="chevron"
              variant="down"
              size={24}
              aria-hidden="true"
              className="pui:pointer-events-none pui:absolute pui:top-1/2 pui:right-3 pui:-translate-y-1/2 pui:text-foreground"
            />
          ) : !multiple && showClear ? (
            // The source `Filled=True` state draws `close_small` instead of the
            // arrow (824:8863), and the disabled filled state keeps the arrow
            // (824:8886). Base UI keeps the control mounted only while there is
            // text, so an empty field never shows it.
            <Combobox.Clear
              aria-label={clearLabel}
              tabIndex={0}
              className="pui:absolute pui:top-1/2 pui:right-3 pui:grid pui:size-6 pui:-translate-y-1/2 pui:place-items-center pui:rounded-sm pui:text-foreground pui:outline-none pui:after:absolute pui:after:-inset-2.5 pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-1 pui:focus-visible:outline-ring"
            >
              <PagoPAIcon name="close" size={24} variant="small" aria-hidden="true" />
            </Combobox.Clear>
          ) : multiple ? null : (
            <Combobox.Trigger
              aria-label={open ? closeLabel : openLabel}
              className="pui:absolute pui:top-1/2 pui:right-3 pui:grid pui:size-6 pui:-translate-y-1/2 pui:place-items-center pui:rounded-sm pui:text-foreground pui:outline-none pui:after:absolute pui:after:-inset-2.5 pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-1 pui:focus-visible:outline-ring"
            >
              <PagoPAIcon
                name="chevron"
                variant={open ? "up" : "down"}
                size={24}
                aria-hidden="true"
              />
            </Combobox.Trigger>
          )}
          {/* The live region stays mounted so the loading and selection
              announcements are not lost to a remount. */}
          <Combobox.Status className="pui:sr-only">{statusText}</Combobox.Status>
        </Combobox.InputGroup>
        {/* Source helper inset: 14px (824:8846 `.HelperText` pad=14/1/14). */}
        <div className="pui:px-3.5">
          <FieldMessages ids={ids} description={description} error={error} success={success} />
        </div>
      </div>
      <Combobox.Portal container={portalHost}>
        <Combobox.Positioner sideOffset={4} className="pui:isolate">
          <Combobox.Popup className="pui:w-(--anchor-width) pui:max-w-(--available-width) pui:rounded-lg pui:bg-popover pui:text-popover-foreground pui:shadow-16">
            {/* The select-all row sits outside the listbox so it stays one
                action row, never a menuitem that reads as an option. */}
            {multiple && selectAllLabel ? (
              <div className="pui:border-b pui:border-border pui:px-3 pui:py-2">
                <button
                  type="button"
                  onClick={() =>
                    commit(allListedSelected ? [] : options.map((option) => option.value))
                  }
                  className="pui:flex pui:w-full pui:items-center pui:gap-2 pui:rounded-md pui:text-left pui:text-label-sb pui:text-foreground pui:outline-none pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"
                >
                  <PagoPAIcon
                    name="check_box"
                    variant={allListedSelected ? "checked" : "unchecked"}
                    size={24}
                    className={allListedSelected ? "pui:text-primary" : "pui:text-foreground"}
                  />
                  {selectAllLabel}
                </button>
              </div>
            ) : null}
            {/* Base UI keeps the empty announcement element mounted (its live
                region must survive), so the visual inset lives on the inner
                line: an inline padding on the root would leave a blank band
                above every result list. */}
            <Combobox.Empty
              data-slot="combobox-empty"
              className="pui:text-label-mini pui:text-muted-foreground"
            >
              <span className="pui:block pui:px-3 pui:py-3">
                {loading ? loadingLabel : emptyLabel}
              </span>
            </Combobox.Empty>
            <Combobox.List
              aria-label={listName}
              aria-busy={loading || undefined}
              className={cn(
                "pui:max-h-60 pui:overflow-auto pui:overscroll-contain",
                options.some((option) => option.description || option.leading || option.chip)
                  ? "pui:p-0"
                  : "pui:p-1",
              )}
            >
              {(option: AutocompleteOption) => (
                <ItemRow
                  key={option.value}
                  {...option}
                  render={(attributes) => (
                    <Combobox.Item
                      {...attributes}
                      value={option.value}
                      disabled={option.disabled}
                      className={cn(
                        "pui:relative pui:flex pui:min-h-11 pui:cursor-default pui:items-center pui:justify-between pui:rounded-md pui:px-3 pui:py-2 pui:outline-none pui:data-highlighted:bg-accent pui:data-highlighted:text-accent-foreground pui:data-disabled:pointer-events-none pui:data-disabled:opacity-50",
                        multiple ? "pui:pr-12" : "pui:[&_svg]:size-5",
                        attributes.className,
                      )}
                    >
                      {attributes.children}
                      {multiple ? (
                        // Same `check_box` Indicator as the multiple select
                        // (616:3865), kept mounted so the box never shifts.
                        <Combobox.ItemIndicator
                          keepMounted
                          render={(indicatorProps, { selected }) => (
                            <span
                              {...indicatorProps}
                              className="pui:pointer-events-none pui:absolute pui:top-3 pui:right-4 pui:flex pui:size-6 pui:items-center pui:justify-center"
                            >
                              {selected ? (
                                <span className="pui:absolute pui:inset-0.75 pui:rounded-2 pui:bg-primary-foreground" />
                              ) : null}
                              <PagoPAIcon
                                name="check_box"
                                variant={selected ? "checked" : "unchecked"}
                                size={24}
                                className={cn("pui:relative", selected && "pui:text-primary")}
                              />
                            </span>
                          )}
                        />
                      ) : (
                        <Combobox.ItemIndicator>
                          <PagoPAIcon name="check" />
                        </Combobox.ItemIndicator>
                      )}
                    </Combobox.Item>
                  )}
                />
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}

export { Autocomplete }
export type { AutocompleteOption, AutocompleteProps }
