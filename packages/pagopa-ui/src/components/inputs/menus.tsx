import * as React from "react"
import { ChevronDown, EllipsisVertical, type LucideIcon } from "@/components/primitives/icons"
import { cn } from "@/lib/cn"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button } from "@/components/primitives/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu"
import { Separator } from "@/components/primitives/separator"

import { ItemRow, type ItemRowContent } from "./item-row"

type DropDownItemBase = ItemRowContent & {
  id: string
  icon?: LucideIcon
  destructive?: boolean
  separatorBefore?: boolean
  /** Source Level=Second: nested row. */
  indent?: boolean
  /** Source Selected=True: highlighted row. */
  selected?: boolean
  level?: "first" | "second"
  leadingAlignment?: "center" | "label"
}

type MenuAction =
  | { onSelect: (checked?: boolean) => void; disabled?: boolean }
  | { disabled: true; onSelect?: never }

type DropDownItem =
  | (DropDownItemBase & {
      type?: "default"
      multiple?: false
      checked?: boolean
      onCheckedChange?: never
    } & MenuAction)
  | (DropDownItemBase & {
      type?: "default"
      multiple: true
      checked: boolean
    } & (
        | { onCheckedChange: (checked: boolean) => void; disabled?: boolean; onSelect?: never }
        | {
            disabled: true
            onCheckedChange?: (checked: boolean) => void
            onSelect?: never
          }
      ))
  | (DropDownItemBase & {
      type: "cta"
      multiple?: boolean
      checked?: never
      onCheckedChange?: never
    } & MenuAction)

function assertMenuActions(items: DropDownItem[]) {
  for (const item of items) {
    if (item.multiple && item.type !== "cta") {
      const onCheckedChange: unknown = item.onCheckedChange
      if (onCheckedChange !== undefined && typeof onCheckedChange !== "function") {
        throw new Error(`Menu item "${item.id}": onCheckedChange must be a function`)
      }
      if (item.disabled !== true && typeof onCheckedChange !== "function") {
        throw new Error(`Menu item "${item.id}": enabled checkbox items require onCheckedChange`)
      }
    } else {
      const onSelect: unknown = item.onSelect
      if (onSelect !== undefined && typeof onSelect !== "function") {
        throw new Error(`Menu item "${item.id}": onSelect must be a function`)
      }
      if (item.disabled !== true && typeof onSelect !== "function") {
        throw new Error(`Menu item "${item.id}": enabled actions require onSelect`)
      }
    }
  }
}

function MenuItems({
  items,
  label,
  dividers = false,
  tone = "default",
  multiselect = false,
  sourceAligned = false,
}: {
  items: DropDownItem[]
  label?: string
  dividers?: boolean
  tone?: "default" | "primary"
  multiselect?: boolean
  sourceAligned?: boolean
}) {
  return (
    <DropdownMenuGroup>
      {label ? <DropdownMenuLabel className="px-3 py-2">{label}</DropdownMenuLabel> : null}
      {items.map((item, index) => {
        const Icon = item.icon
        const multiple = item.type !== "cta" && (item.multiple === true || multiselect)
        // Mirrors ItemRow: description/leading/chip turn the row into its rich layout.
        const rich = Boolean(item.description || item.leading || Icon || item.chip)
        return (
          <React.Fragment key={item.id}>
            {item.separatorBefore || (dividers && index > 0) ? (
              <DropdownMenuSeparator className="mx-0 my-0" />
            ) : null}
            <ItemRow
              {...item}
              multiple={multiple}
              leadingAlignment={
                sourceAligned && item.type !== "cta"
                  ? item.icon
                    ? "label"
                    : item.leadingAlignment
                  : undefined
              }
              leading={
                Icon ? (
                  <>
                    <Icon aria-hidden="true" />
                    {item.leading}
                  </>
                ) : (
                  item.leading
                )
              }
              render={(attributes) => {
                const className = cn(
                  // Source rows fill the panel edge to edge (panel padding 0) and
                  // keep the 16/22 label line box. The source's Titillio 500 is the
                  // Semibold face, which this bundle declares at CSS 600 (there is no
                  // 500 face and font-synthesis is off, so `font-medium` would render
                  // Regular).
                  "min-h-12 gap-2 rounded-none px-4 py-3 text-body",
                  !rich && "text-body-sb",
                  attributes.className,
                  tone === "primary" && "text-primary",
                  // The source decorative leading art is #BBC2D6. Adaptation
                  // `location-icon-currentcolor` (node 610:33732) keeps its 16px
                  // monochrome silhouette but paints it with the row's currentColor
                  // for legibility and forced-colors support, including the
                  // focus/highlight states. Adaptation `selected-soft-token`: the
                  // source highlight is Blue 500 #0B3EE3 at 8% (composite #EBF0FD);
                  // the rows use the semantic selection-soft #E7ECFC (at most 4/255
                  // per RGB channel away) and system Highlight/HighlightText under
                  // forced colors.
                  sourceAligned &&
                    "focus:bg-selection-soft focus:text-foreground data-highlighted:bg-selection-soft data-highlighted:text-foreground data-selected:bg-selection-soft focus:[&_[data-slot=item-row-label]]:text-foreground data-highlighted:[&_[data-slot=item-row-label]]:text-foreground focus:[&_[data-slot=item-row-description]]:text-muted-foreground data-highlighted:[&_[data-slot=item-row-description]]:text-muted-foreground focus:[&_[data-slot=item-row-leading]_*]:text-foreground data-highlighted:[&_[data-slot=item-row-leading]_*]:text-foreground",
                  // Adaptation `cta-menuitem-action`: the source CTA Button is one
                  // native menuitem action, never a nested button, so menu semantics
                  // and keyboard order hold; it keeps the 24px icon and 8px gap.
                  sourceAligned &&
                    item.type === "cta" &&
                    "text-primary focus:text-primary data-highlighted:text-primary focus:[&_[data-slot=item-row-label]]:text-primary data-highlighted:[&_[data-slot=item-row-label]]:text-primary focus:[&_[data-slot=item-row-leading]_*]:text-primary data-highlighted:[&_[data-slot=item-row-leading]_*]:text-primary",
                  sourceAligned &&
                    item.type !== "cta" &&
                    (item.icon || item.leadingAlignment === "label") &&
                    "[&_[data-slot=item-row-leading]>svg]:size-4!",
                  sourceAligned &&
                    item.type !== "cta" &&
                    "focus:[&_[data-slot=chip]]:text-warning-foreground focus:[&_[data-slot=chip]_*]:text-warning-foreground data-highlighted:[&_[data-slot=chip]]:text-warning-foreground data-highlighted:[&_[data-slot=chip]_*]:text-warning-foreground focus:[&_[data-slot=avatar-identity]_*]:text-foreground data-highlighted:[&_[data-slot=avatar-identity]_*]:text-foreground",
                  sourceAligned &&
                    "forced-colors:focus:bg-[Highlight] forced-colors:focus:text-[HighlightText] forced-colors:focus:**:text-[HighlightText] forced-colors:data-highlighted:bg-[Highlight] forced-colors:data-highlighted:text-[HighlightText] forced-colors:data-highlighted:**:text-[HighlightText] forced-colors:focus-visible:outline-[Highlight]",
                  (item.indent || (sourceAligned && item.level === "second")) && "pl-12",
                  item.selected && "bg-accent",
                  sourceAligned && multiple && "pr-12",
                )

                if (multiple) {
                  return (
                    <DropdownMenuCheckboxItem
                      {...attributes}
                      checked={item.checked ?? false}
                      onCheckedChange={(checked) => {
                        if (item.multiple === true) {
                          item.onCheckedChange?.(checked)
                        } else {
                          item.onSelect?.(checked)
                        }
                      }}
                      disabled={item.disabled}
                      className={className}
                      indicator={
                        sourceAligned
                          ? (checked) => (
                              <PagoPAIcon
                                name="check_box"
                                variant={checked ? "checked" : "unchecked"}
                                size={24}
                                className={checked ? "text-primary!" : "text-foreground!"}
                              />
                            )
                          : undefined
                      }
                      indicatorClassName={sourceAligned ? "top-3 right-4 size-6" : undefined}
                    />
                  )
                }

                return (
                  <DropdownMenuItem
                    {...attributes}
                    disabled={item.disabled}
                    variant={item.destructive ? "destructive" : "default"}
                    onClick={() => item.onSelect?.()}
                    className={className}
                  />
                )
              }}
            />
          </React.Fragment>
        )
      })}
    </DropdownMenuGroup>
  )
}

function DropDownSkeleton() {
  return (
    <div data-slot="dropdown-skeleton" className="grid gap-3 p-4" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <React.Fragment key={index}>
          <div className="grid gap-1">
            <span className="h-4 w-(--menu-skeleton-width) rounded-lg bg-border" />
            <span className="h-4 w-full rounded-lg bg-border" />
          </div>
          {index < 3 ? <Separator /> : null}
        </React.Fragment>
      ))}
    </div>
  )
}

function DropDownEmpty({
  title,
  description,
}: {
  title: React.ReactNode
  description?: React.ReactNode
}) {
  return (
    <div
      data-slot="dropdown-empty"
      className="grid justify-items-center gap-2 rounded-lg bg-muted p-6 text-center"
    >
      <PagoPAIcon name="error" filled={false} size={24} className="text-choice-icon" />
      <div className="grid gap-0.5">
        <p className="text-label-sb text-muted-soft">{title}</p>
        {description ? <p className="text-label-mini text-muted-soft">{description}</p> : null}
      </div>
    </div>
  )
}

function DropDown({
  triggerLabel,
  items,
  label,
  back,
  disabled,
  loading = false,
  multiselect = false,
  dividers = true,
  emptyTitle = "Non ci sono corrispondenze",
  emptyDescription,
  backLabel = "Indietro",
  loadingLabel = "Caricamento in corso",
  className,
}: {
  /** Visible label of the trigger button. */
  triggerLabel: React.ReactNode
  /** Ordinary rows; CTA/back rows keep their action semantics. */
  items: DropDownItem[]
  /** Accessible name of the popup list. */
  label?: string
  /** Source CTA row of the selection list. */
  back?: { label?: string; onSelect: () => void }
  /** Disables the trigger without unmounting the menu. */
  disabled?: boolean
  /** Busy state: the list is replaced by the loading skeleton. */
  loading?: boolean
  /** All ordinary rows become checkbox items; CTA/back rows remain actions. */
  multiselect?: boolean
  /** Separators between the rows. @default true */
  dividers?: boolean
  /** Title of the empty state when `items` is empty. @default "Non ci sono corrispondenze" */
  emptyTitle?: React.ReactNode
  /** Description of the empty state. */
  emptyDescription?: React.ReactNode
  /** Text of the back row when it carries no label. @default "Indietro" */
  backLabel?: string
  /** Announced text of the busy list. @default "Caricamento in corso" */
  loadingLabel?: string
  /** ClassName applied to the trigger button. */
  className?: string
}) {
  assertMenuActions(items)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" disabled={disabled} className={className} />
        }
      >
        {triggerLabel}
        <ChevronDown aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={cn(
          // Source panel has no outer padding: rows and Color/Border/Border fill
          // dividers run edge to edge (node 610:36297, 3262:40787).
          "min-w-(--menu-width) p-0",
          loading && "overflow-y-clip",
        )}
      >
        {loading ? (
          <>
            <DropDownSkeleton />
            {/* The skeleton art is hidden; one disabled item keeps the menu a valid
                ARIA shape (a menu needs at least one menuitem) and names the busy state. */}
            <DropdownMenuItem disabled className="sr-only">
              {loadingLabel}
            </DropdownMenuItem>
          </>
        ) : items.length ? (
          <>
            {back ? (
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={back.onSelect}
                  className="min-h-12 gap-2 rounded-none px-4 py-3 text-body text-primary [&_svg]:size-6"
                >
                  <PagoPAIcon name="arrow" variant="left" />
                  {back.label ?? backLabel}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            ) : null}
            <MenuItems
              items={items}
              label={label}
              multiselect={multiselect}
              dividers={dividers}
              sourceAligned
            />
          </>
        ) : (
          <DropdownMenuItem disabled className="block rounded-lg p-0 data-disabled:opacity-100">
            <DropDownEmpty title={emptyTitle} description={emptyDescription} />
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function MenuDropDown({
  accessibleLabel = "Apri menu",
  items,
  label,
}: {
  /** Accessible name of the icon trigger. @default "Apri menu" */
  accessibleLabel?: string
  /** Rows of the menu, with the same item contract as `DropDown`. */
  items: DropDownItem[]
  /** Accessible name of the popup list. */
  label?: string
}) {
  assertMenuActions(items)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button type="button" variant="ghost" size="icon" aria-label={accessibleLabel} />}
      >
        <EllipsisVertical aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-(--menu-width) p-0">
        <MenuItems items={items} label={label} dividers tone="primary" />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { DropDown, MenuDropDown, type DropDownItem }
