"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { Icon } from "@/components/icons/icon"
import { Left as ArrowLeftIcon } from "@/components/icons/generated/arrow"
import {
  Checked as CheckBoxCheckedIcon,
  Default as CheckBoxIcon,
} from "@/components/icons/generated/check-box"
import { Down as ChevronDownIcon } from "@/components/icons/generated/chevron"
import { Default as ErrorOutlinedIcon } from "@/components/icons/generated/error"
import { Default as MoreVertIcon } from "@/components/icons/generated/more-vert"
import type { IconComponent } from "@/components/icons/generated/types"
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

export interface DropDownItemBase extends ItemRowContent {
  id: string
  /** Rendered as the row leading glyph; any pinned variant component fits. */
  icon?: IconComponent
  destructive?: boolean
  separatorBefore?: boolean
  /** Source Level=Second: nested row. */
  indent?: boolean
  /** Source Selected=True: highlighted row. */
  selected?: boolean
  level?: "first" | "second"
  leadingAlignment?: "center" | "label"
}

export type MenuAction =
  | { onSelect: (checked?: boolean) => void; disabled?: boolean }
  | { disabled: true; onSelect?: never }

type DropdownItem =
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

function assertMenuActions(items: DropdownItem[]) {
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
  items: DropdownItem[]
  label?: string
  dividers?: boolean
  tone?: "default" | "primary"
  multiselect?: boolean
  sourceAligned?: boolean
}) {
  return (
    <DropdownMenuGroup>
      {label ? <DropdownMenuLabel className="pui:px-3 pui:py-2">{label}</DropdownMenuLabel> : null}
      {items.map((item, index) => {
        const ItemIcon = item.icon
        const multiple = item.type !== "cta" && (item.multiple === true || multiselect)
        // Mirrors ItemRow: description/leading/chip turn the row into its rich layout.
        const rich = Boolean(item.description || item.leading || ItemIcon || item.chip)
        return (
          <React.Fragment key={item.id}>
            {item.separatorBefore || (dividers && index > 0) ? (
              <DropdownMenuSeparator className="pui:mx-0 pui:my-0" />
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
                ItemIcon ? (
                  <>
                    <ItemIcon aria-hidden="true" />
                    {item.leading}
                  </>
                ) : (
                  item.leading
                )
              }
              render={(attributes) => {
                const className = cn(
                  // Source rows fill the panel edge to edge (panel padding 0) and
                  // keep the 16/22 label line box: 12px insets + the 22px line make
                  // the source 46px row, which clears the 44px target without a
                  // minimum-height floor. The source's Titillio 500 is the
                  // Semibold face, which this bundle declares at CSS 600 (there
                  // is no 500 face and font-synthesis is off, so `font-medium`
                  // would render Regular).
                  "pui:gap-2 pui:rounded-none pui:px-4 pui:py-3 pui:text-body",
                  !rich && "pui:text-body-sb",
                  attributes.className,
                  tone === "primary" && "pui:text-primary",
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
                    "pui:focus:bg-selection-soft pui:focus:text-foreground pui:data-highlighted:bg-selection-soft pui:data-highlighted:text-foreground pui:data-selected:bg-selection-soft pui:focus:[&_[data-slot=item-row-label]]:text-foreground pui:data-highlighted:[&_[data-slot=item-row-label]]:text-foreground pui:focus:[&_[data-slot=item-row-description]]:text-muted-foreground pui:data-highlighted:[&_[data-slot=item-row-description]]:text-muted-foreground pui:focus:[&_[data-slot=item-row-leading]_*]:text-foreground pui:data-highlighted:[&_[data-slot=item-row-leading]_*]:text-foreground",
                  // Adaptation `cta-menuitem-action`: the source CTA Button is one
                  // native menuitem action, never a nested button, so menu semantics
                  // and keyboard order hold; it keeps the 24px icon and 8px gap.
                  sourceAligned &&
                    item.type === "cta" &&
                    "pui:text-primary pui:focus:text-primary pui:data-highlighted:text-primary pui:focus:[&_[data-slot=item-row-label]]:text-primary pui:data-highlighted:[&_[data-slot=item-row-label]]:text-primary pui:focus:[&_[data-slot=item-row-leading]_*]:text-primary pui:data-highlighted:[&_[data-slot=item-row-leading]_*]:text-primary",
                  sourceAligned &&
                    item.type !== "cta" &&
                    (item.icon || item.leadingAlignment === "label") &&
                    "pui:[&_[data-slot=item-row-leading]>svg:not(.pagopa-icon)]:size-4!",
                  sourceAligned &&
                    item.type !== "cta" &&
                    "pui:focus:[&_[data-slot=chip]]:text-warning-foreground pui:focus:[&_[data-slot=chip]_*]:text-warning-foreground pui:data-highlighted:[&_[data-slot=chip]]:text-warning-foreground pui:data-highlighted:[&_[data-slot=chip]_*]:text-warning-foreground pui:focus:[&_[data-slot=avatar-identity]_*]:text-foreground pui:data-highlighted:[&_[data-slot=avatar-identity]_*]:text-foreground",
                  sourceAligned &&
                    "pui:forced-colors:focus:bg-[Highlight] pui:forced-colors:focus:text-[HighlightText] pui:forced-colors:focus:**:text-[HighlightText] pui:forced-colors:data-highlighted:bg-[Highlight] pui:forced-colors:data-highlighted:text-[HighlightText] pui:forced-colors:data-highlighted:**:text-[HighlightText] pui:forced-colors:focus-visible:outline-[Highlight]",
                  (item.indent || (sourceAligned && item.level === "second")) && "pui:pl-12",
                  item.selected && "pui:bg-accent",
                  sourceAligned && multiple && "pui:pr-12",
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
                              <Icon
                                source={checked ? CheckBoxCheckedIcon : CheckBoxIcon}
                                size={24}
                                className={checked ? "pui:text-primary!" : "pui:text-foreground!"}
                              />
                            )
                          : undefined
                      }
                      indicatorClassName={
                        sourceAligned ? "pui:top-3 pui:right-4 pui:size-6" : undefined
                      }
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
    <div data-slot="dropdown-skeleton" className="pui:grid pui:gap-3 pui:p-4" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <React.Fragment key={index}>
          <div className="pui:grid pui:gap-1">
            <span className="pui:h-4 pui:w-(--pui-menu-skeleton-width) pui:rounded-lg pui:bg-border" />
            <span className="pui:h-4 pui:w-full pui:rounded-lg pui:bg-border" />
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
      className="pui:grid pui:justify-items-center pui:gap-2 pui:rounded-lg pui:bg-muted pui:p-6 pui:text-center"
    >
      <Icon source={ErrorOutlinedIcon} size={24} className="pui:text-choice-icon" />
      <div className="pui:grid pui:gap-0.5">
        <p className="pui:text-label-sb pui:text-muted-soft">{title}</p>
        {description ? (
          <p className="pui:text-label-mini pui:text-muted-soft">{description}</p>
        ) : null}
      </div>
    </div>
  )
}

/** Props of the rich action and option menu. */
export interface DropdownProps {
  /** Visible label of the trigger button. */
  triggerLabel: React.ReactNode
  /** Ordinary rows; CTA/back rows keep their action semantics. */
  items: DropdownItem[]
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
  /** Title of the empty state when `items` is empty. @default messages.dropdown.emptyTitle */
  emptyTitle?: React.ReactNode
  /** Description of the empty state. */
  emptyDescription?: React.ReactNode
  /** Text of the back row when it carries no label. @default messages.dropdown.backLabel */
  backLabel?: string
  /** Announced text of the busy list. @default messages.dropdown.loadingLabel */
  loadingLabel?: string
  /** ClassName applied to the trigger button. */
  className?: string
}

/**
 * Rich action and option menu behind a labelled trigger: single or multiple
 * selection, second-level rows, caller actions and a loading/empty panel.
 *
 * Figma: DropDown (node 616:3864)
 */
function Dropdown({
  triggerLabel,
  items,
  label,
  back,
  disabled,
  loading = false,
  multiselect = false,
  dividers = true,
  emptyTitle: emptyTitleProp,
  emptyDescription,
  backLabel: backLabelProp,
  loadingLabel: loadingLabelProp,
  className,
}: DropdownProps) {
  const t = useMessages("dropdown")
  const emptyTitle = emptyTitleProp ?? t.emptyTitle
  const backLabel = backLabelProp ?? t.backLabel
  const loadingLabel = loadingLabelProp ?? t.loadingLabel

  assertMenuActions(items)
  return (
    <DropdownMenu data-slot="dropdown">
      <DropdownMenuTrigger
        render={
          <Button type="button" variant="outline" disabled={disabled} className={className} />
        }
      >
        {triggerLabel}
        <Icon source={ChevronDownIcon} size={20} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className={cn(
          // Source panel has no outer padding: rows and Color/Border/Border fill
          // dividers run edge to edge (node 610:36297, 3262:40787).
          "pui:min-w-(--pui-menu-width) pui:p-0",
          loading && "pui:overflow-y-clip",
        )}
      >
        {loading ? (
          <>
            <DropDownSkeleton />
            {/* The skeleton art is hidden; one disabled item keeps the menu a valid
                ARIA shape (a menu needs at least one menuitem) and names the busy state. */}
            <DropdownMenuItem disabled className="pui:sr-only">
              {loadingLabel}
            </DropdownMenuItem>
          </>
        ) : items.length ? (
          <>
            {back ? (
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={back.onSelect}
                  className="pui:min-h-12 pui:gap-2 pui:rounded-none pui:px-4 pui:py-3 pui:text-body pui:text-primary pui:[&_svg:not(.pagopa-icon)]:size-6"
                >
                  <Icon source={ArrowLeftIcon} size={24} />
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
          <DropdownMenuItem
            disabled
            className="pui:block pui:rounded-lg pui:p-0 pui:data-disabled:opacity-100"
          >
            <DropDownEmpty title={emptyTitle} description={emptyDescription} />
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Props of the icon menu. */
export interface MenuDropdownProps {
  /** Accessible name of the icon trigger. @default messages.menuDropdown.accessibleLabel */
  accessibleLabel?: string
  /** Rows of the menu, with the same item contract as `Dropdown`. */
  items: DropdownItem[]
  /** Accessible name of the popup list. */
  label?: string
}

/**
 * Icon menu for secondary actions, with the same rows as `Dropdown` and a
 * dedicated accessible name on the trigger.
 *
 * Figma: MenuDropDown (node 3262:40787)
 */
function MenuDropdown({ accessibleLabel: accessibleLabelProp, items, label }: MenuDropdownProps) {
  const t = useMessages("menuDropdown")
  const accessibleLabel = accessibleLabelProp ?? t.accessibleLabel

  assertMenuActions(items)
  return (
    <DropdownMenu data-slot="menu-dropdown">
      <DropdownMenuTrigger
        render={<Button type="button" variant="ghost" size="icon" aria-label={accessibleLabel} />}
      >
        <Icon source={MoreVertIcon} size={20} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="pui:min-w-(--pui-menu-width) pui:p-0">
        <MenuItems items={items} label={label} dividers tone="primary" />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { Dropdown, MenuDropdown }
export type { DropdownItem }
