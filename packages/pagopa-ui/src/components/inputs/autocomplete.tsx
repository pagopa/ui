"use client"

import * as React from "react"
import { Combobox } from "@/components/primitives/combobox"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"
import { Check } from "@/components/primitives/icons"
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

type AutocompleteSharedProps = FieldStateProps & {
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
  const clearAllLabel = clearAllLabelProp ?? t.clearAllLabel
  const openLabel = openLabelProp ?? t.openLabel
  const closeLabel = closeLabelProp ?? t.closeLabel
  const loadingLabel = loadingLabelProp ?? t.loadingLabel

  const ids = useFieldIds(id)
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
  // The source collapses two or more values into a count badge and keeps the
  // clear control inside it, so a single value keeps its full name and the
  // action group keeps `[clear][chevron]` (616:3865, 824:8838).
  const showClear = multiple ? selection.length === 1 : filled
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
      <div className={cn("grid min-w-0 gap-2", className)}>
        <Combobox.InputGroup className="relative min-w-0">
          {leadingIcon ? (
            <span
              aria-hidden="true"
              data-slot="autocomplete-leading-icon"
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-choice-icon [&_svg]:size-6"
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
                "flex min-h-12 min-w-0 flex-wrap items-center gap-2 rounded-lg border border-input bg-background py-2 pr-16 pl-3 transition-[color,background-color,border-color]",
                leadingIcon && "pl-11",
                focused && !error && "border-ring outline-2 outline-offset-1 outline-ring",
                error && "border-destructive",
                disabled && "bg-muted text-muted-foreground",
              )}
            >
              <Combobox.Value>
                {(selectedValues: string[]) => {
                  const values = selectedValues ?? []
                  if (values.length > 1) {
                    return (
                      <InputChip
                        data-slot="autocomplete-counter"
                        className="shrink-0"
                        removeLabel={clearAllLabel}
                        onRemove={disabled ? undefined : () => commit([])}
                      >
                        <span aria-hidden="true">{values.length}</span>
                        <span className="sr-only">{counterLabel(values.length)}</span>
                      </InputChip>
                    )
                  }
                  return values.map((entry, index) => (
                    <InputChip key={`${entry}-${index}`} className="max-w-full">
                      {labelsOf([entry])[0] ?? entry}
                    </InputChip>
                  ))
                }}
              </Combobox.Value>
              <Combobox.Input
                ref={inputRef}
                id={ids.controlId}
                placeholder={placeholder ?? " "}
                aria-invalid={Boolean(error) || undefined}
                aria-describedby={describedBy(ids, { description, error, success })}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={(event) => {
                  // Without a per-chip control the last value leaves with
                  // Backspace, the native combobox removal.
                  if (event.key !== "Backspace" || inputValue || disabled) return
                  if (!selection.length) return
                  event.preventDefault()
                  commit(selection.slice(0, -1))
                }}
                render={
                  <Input
                    className={cn(
                      "peer min-h-6 min-w-0 flex-1 border-0 bg-transparent p-0 text-label-sb focus-visible:outline-none",
                      disabled && "bg-transparent text-muted-foreground",
                    )}
                  />
                }
              />
            </div>
          ) : (
            <Combobox.Input
              ref={inputRef}
              id={ids.controlId}
              placeholder={placeholder ?? " "}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={describedBy(ids, { description, error, success })}
              render={
                <Input className={cn("peer py-3 pr-10 text-label-sb", leadingIcon && "pl-11")} />
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
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-foreground"
            />
          ) : multiple ? (
            <span
              data-slot="autocomplete-actions"
              className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center"
            >
              {showClear ? (
                <Combobox.Clear
                  aria-label={clearLabel}
                  tabIndex={0}
                  className="grid size-6 place-items-center rounded-sm text-foreground outline-none after:absolute after:-inset-2.5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-ring"
                >
                  <PagoPAIcon name="close" size={24} variant="small" aria-hidden="true" />
                </Combobox.Clear>
              ) : null}
              <Combobox.Trigger
                aria-label={open ? closeLabel : openLabel}
                className="grid size-6 place-items-center rounded-sm text-foreground outline-none after:absolute after:-inset-2.5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-ring"
              >
                <PagoPAIcon
                  name="chevron"
                  variant={open ? "up" : "down"}
                  size={24}
                  aria-hidden="true"
                />
              </Combobox.Trigger>
            </span>
          ) : showClear ? (
            // The source `Filled=True` state draws `close_small` instead of the
            // arrow (824:8863), and the disabled filled state keeps the arrow
            // (824:8886). Base UI keeps the control mounted only while there is
            // text, so an empty field never shows it.
            <Combobox.Clear
              aria-label={clearLabel}
              tabIndex={0}
              className="absolute top-1/2 right-3 grid size-6 -translate-y-1/2 place-items-center rounded-sm text-foreground outline-none after:absolute after:-inset-2.5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-ring"
            >
              <PagoPAIcon name="close" size={24} variant="small" aria-hidden="true" />
            </Combobox.Clear>
          ) : (
            <Combobox.Trigger
              aria-label={open ? closeLabel : openLabel}
              className="absolute top-1/2 right-3 grid size-6 -translate-y-1/2 place-items-center rounded-sm text-foreground outline-none after:absolute after:-inset-2.5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-ring"
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
          <Combobox.Status className="sr-only">{statusText}</Combobox.Status>
        </Combobox.InputGroup>
        {/* Source helper inset: 14px (824:8846 `.HelperText` pad=14/1/14). */}
        <div className="px-3.5">
          <FieldMessages ids={ids} description={description} error={error} success={success} />
        </div>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="isolate">
          <Combobox.Popup className="w-(--anchor-width) max-w-(--available-width) rounded-lg bg-popover text-popover-foreground shadow-16">
            {/* The select-all row sits outside the listbox so it stays one
                action row, never a menuitem that reads as an option. */}
            {multiple && selectAllLabel ? (
              <div className="border-b border-border px-3 py-2">
                <button
                  type="button"
                  onClick={() =>
                    commit(allListedSelected ? [] : options.map((option) => option.value))
                  }
                  className="flex w-full items-center gap-2 rounded-md text-left text-label-sb text-foreground outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <PagoPAIcon
                    name="check_box"
                    variant={allListedSelected ? "checked" : "unchecked"}
                    size={24}
                    className={allListedSelected ? "text-primary" : "text-foreground"}
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
              className="text-label-mini text-muted-foreground"
            >
              <span className="block px-3 py-3">{loading ? loadingLabel : emptyLabel}</span>
            </Combobox.Empty>
            <Combobox.List
              aria-label={listName}
              aria-busy={loading || undefined}
              className={cn(
                "max-h-60 overflow-auto overscroll-contain",
                options.some((option) => option.description || option.leading || option.chip)
                  ? "p-0"
                  : "p-1",
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
                        "relative flex min-h-11 cursor-default items-center justify-between rounded-md px-3 py-2 outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
                        multiple ? "pr-12" : "[&_svg]:size-5",
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
                              className="pointer-events-none absolute top-3 right-4 flex size-6 items-center justify-center"
                            >
                              {selected ? (
                                <span className="absolute inset-0.75 rounded-2 bg-primary-foreground" />
                              ) : null}
                              <PagoPAIcon
                                name="check_box"
                                variant={selected ? "checked" : "unchecked"}
                                size={24}
                                className={cn("relative", selected && "text-primary")}
                              />
                            </span>
                          )}
                        />
                      ) : (
                        <Combobox.ItemIndicator>
                          <Check aria-hidden="true" />
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

export { Autocomplete, type AutocompleteOption }
