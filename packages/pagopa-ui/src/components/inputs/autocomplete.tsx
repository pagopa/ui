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
  className?: string
}) {
  const ids = useFieldIds(id)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [internalValue, setInternalValue] = React.useState<string | null>(defaultValue || null)
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

  return (
    <Combobox.Root
      items={items}
      name={name}
      value={value === undefined ? internalValue : value || null}
      required={required}
      disabled={disabled}
      autoComplete="off"
      onValueChange={(next) => {
        if (value === undefined) setInternalValue(next)
        onValueChange?.(next ?? "")
      }}
    >
      <div className={cn("grid gap-2", className)}>
        <Combobox.InputGroup className="relative">
          <Combobox.Input
            ref={inputRef}
            id={ids.controlId}
            placeholder=" "
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy(ids, { description, error, success })}
            render={<Input className="peer py-3 pr-10 text-label-sb" />}
          />
          <FloatingFieldLabel
            id={`${ids.controlId}-label`}
            htmlFor={ids.controlId}
            label={label}
            required={required}
            requiredLabel={requiredLabel}
          />
          <PagoPAIcon
            name="chevron"
            variant="down"
            size={24}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-foreground"
          />
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
              <span className="block px-3 py-3">{emptyLabel}</span>
            </Combobox.Empty>
            <Combobox.List
              aria-labelledby={`${ids.controlId}-label`}
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
