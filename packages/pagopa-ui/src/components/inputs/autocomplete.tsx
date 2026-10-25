import * as React from "react"
import { Combobox } from "@/components/primitives/combobox"
import { cn } from "@/lib/cn"
import { Check } from "@/components/primitives/icons"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

import { Input } from "@/components/primitives/input"

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

function Autocomplete({
  id,
  label,
  options,
  value,
  defaultValue = "",
  onValueChange,
  description,
  error,
  success,
  required,
  requiredLabel,
  disabled,
  name,
  emptyLabel = "Nessun risultato",
  leadingIcon = defaultLeadingIcon,
  clearLabel = "Svuota campo",
  openLabel = "apri lista",
  closeLabel = "chiudi lista",
  listLabel = defaultListLabel,
  selectedLabel = defaultSelectedLabel,
  loading = false,
  loadingLabel = "Caricamento lista in corso",
  className,
}: FieldStateProps & {
  id?: string
  options: AutocompleteOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  name?: string
  /** Announced and shown text when no option matches. @default "Nessun risultato" */
  emptyLabel?: string
  /** Decorative artwork before the value; pass `null` to remove it. */
  leadingIcon?: React.ReactNode
  /** Accessible name of the clear control. @default "Svuota campo" */
  clearLabel?: string
  /** Accessible name of the trigger that opens the list. @default "apri lista" */
  openLabel?: string
  /** Accessible name of the trigger that closes the list. @default "chiudi lista" */
  closeLabel?: string
  /** Accessible name of the list, from the field label. @default "Lista {label}" */
  listLabel?: (label: string) => string
  /** Announcement after a choice, from the selected values. @default "hai selezionato {values}" */
  selectedLabel?: (values: string[]) => string
  /** Announces that the options are being loaded. @default false */
  loading?: boolean
  /** Announced loading text. @default "Caricamento lista in corso" */
  loadingLabel?: string
  className?: string
}) {
  const ids = useFieldIds(id)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [internalValue, setInternalValue] = React.useState<string | null>(defaultValue || null)
  const [inputValue, setInputValue] = React.useState(defaultValue)
  const [open, setOpen] = React.useState(false)
  const [announcement, setAnnouncement] = React.useState("")
  useFormReset(inputRef, () => {
    if (value === undefined) setInternalValue(defaultValue || null)
  })
  const items = React.useMemo(
    () =>
      Combobox.createItems(options, {
        getValue: (option) => option.value,
        getLabel: (option) => option.label,
      }),
    [options],
  )
  const currentValue = value === undefined ? internalValue : value || null
  const filled = Boolean(currentValue || inputValue)
  const labelText = typeof label === "string" ? label : ""
  const listName = listLabel(labelText)
  const statusText = loading ? loadingLabel : announcement

  return (
    <Combobox.Root
      items={items}
      name={name}
      value={currentValue}
      required={required}
      disabled={disabled}
      autoComplete="off"
      onOpenChange={setOpen}
      onInputValueChange={(next) => setInputValue(next)}
      onValueChange={(next) => {
        if (value === undefined) setInternalValue(next)
        onValueChange?.(next ?? "")
        const option = options.find((entry) => entry.value === next)
        const announced = option && typeof option.label === "string" ? option.label : next
        setAnnouncement(announced ? selectedLabel([announced]) : "")
      }}
    >
      <div className={cn("grid gap-2", className)}>
        <Combobox.InputGroup className="relative">
          {leadingIcon ? (
            <span
              aria-hidden="true"
              data-slot="autocomplete-leading-icon"
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-choice-icon [&_svg]:size-6"
            >
              {leadingIcon}
            </span>
          ) : null}
          <Combobox.Input
            ref={inputRef}
            id={ids.controlId}
            placeholder=" "
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy(ids, { description, error, success })}
            render={
              <Input className={cn("peer py-3 pr-10 text-label-sb", leadingIcon && "pl-11")} />
            }
          />
          <FloatingFieldLabel
            id={`${ids.controlId}-label`}
            htmlFor={ids.controlId}
            label={label}
            required={required}
            requiredLabel={requiredLabel}
            leadingIcon={Boolean(leadingIcon)}
          />
          {disabled ? (
            <PagoPAIcon
              name="chevron"
              variant="down"
              size={24}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-foreground"
            />
          ) : filled ? (
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
                        "flex min-h-11 cursor-default items-center justify-between rounded-md px-3 py-2 outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:size-5",
                        attributes.className,
                      )}
                    >
                      {attributes.children}
                      <Combobox.ItemIndicator>
                        <Check aria-hidden="true" />
                      </Combobox.ItemIndicator>
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
