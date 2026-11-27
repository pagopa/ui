"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { usePortalHost } from "@/lib/ui-provider"
import { cn } from "@/lib/cn"

import { Icon } from "@/components/icons/icon"
import { Default as CheckIcon } from "@/components/icons/generated/check"
import {
  Checked as CheckBoxCheckedIcon,
  Default as CheckBoxIcon,
} from "@/components/icons/generated/check-box"
import { Down as ChevronDownIcon, Up as ChevronUpIcon } from "@/components/icons/generated/chevron"

const Select = SelectPrimitive.Root

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("pui:scroll-my-1 pui:p-1", className)}
      {...props}
    />
  )
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("pui:flex pui:flex-1 pui:text-left", className)}
      {...props}
    />
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  icon,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
  icon?: React.ReactElement
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "pui:flex pui:w-full pui:items-center pui:justify-between pui:gap-2 pui:rounded-lg pui:border pui:border-input pui:bg-background pui:px-3 pui:py-2 pui:text-body pui:whitespace-nowrap pui:transition-[color,background-color,border-color] pui:outline-none pui:select-none pui:focus-visible:border-ring pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-1 pui:focus-visible:outline-ring pui:disabled:cursor-not-allowed pui:disabled:bg-muted pui:disabled:text-muted-foreground pui:aria-invalid:border-destructive pui:aria-invalid:outline-destructive pui:data-placeholder:text-muted-foreground pui:data-[size=default]:min-h-12 pui:data-[size=sm]:min-h-10 pui:*:data-[slot=select-value]:line-clamp-1 pui:*:data-[slot=select-value]:flex pui:*:data-[slot=select-value]:items-center pui:*:data-[slot=select-value]:gap-2 pui:[&_svg]:pointer-events-none pui:[&_svg]:shrink-0 pui:[&_svg:not(.pagopa-icon)]:size-5",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          icon ?? (
            <Icon
              source={ChevronDownIcon}
              className="pui:pointer-events-none pui:size-4 pui:text-muted-foreground"
            />
          )
        }
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  header,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  > & {
    header?: React.ReactNode
  }) {
  const portalHost = usePortalHost()
  return (
    <SelectPrimitive.Portal container={portalHost}>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="pui:isolate pui:z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          // No open/close animation: the popup is a static surface that must be
          // laid out and visible in the same frame it opens (a mount transition
          // leaves a zero-opacity/zero-height frame), and the library does not
          // invent motion a reduced-motion user would still see.
          className={cn(
            "pui:relative pui:isolate pui:z-50 pui:max-h-(--available-height) pui:w-(--anchor-width) pui:min-w-36 pui:origin-(--transform-origin) pui:overflow-x-hidden pui:overflow-y-auto pui:rounded-lg pui:bg-popover pui:text-popover-foreground pui:shadow-16",
            className,
          )}
          {...props}
        >
          {header}
          <SelectScrollUpButton />
          <SelectPrimitive.List aria-label={ariaLabel} aria-labelledby={ariaLabelledBy}>
            {children}
          </SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("pui:px-1.5 pui:py-1 pui:text-caption pui:text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  multiple = false,
  ...props
}: SelectPrimitive.Item.Props & { multiple?: boolean }) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "pui:relative pui:flex pui:min-h-11 pui:w-full pui:cursor-default pui:items-center pui:gap-2 pui:rounded-md pui:py-2 pui:pr-9 pui:pl-3 pui:text-body pui:focus:outline-hidden pui:select-none pui:focus:bg-accent pui:focus:text-accent-foreground pui:data-disabled:pointer-events-none pui:data-disabled:opacity-50 pui:[&_svg]:pointer-events-none pui:[&_svg]:shrink-0 pui:[&_svg:not(.pagopa-icon)]:size-4",
        multiple && "pui:pr-12",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="pui:flex pui:flex-1 pui:gap-2 pui:whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        keepMounted={multiple}
        render={(indicatorProps, { selected }) => (
          <span
            {...indicatorProps}
            className={cn(
              "pui:pointer-events-none pui:absolute pui:flex pui:items-center pui:justify-center",
              multiple ? "pui:top-3 pui:right-4 pui:size-6" : "pui:right-2 pui:size-4",
            )}
          >
            {multiple ? (
              <>
                {selected ? (
                  <span className="pui:absolute pui:inset-0.75 pui:rounded-2 pui:bg-primary-foreground" />
                ) : null}
                <Icon
                  source={selected ? CheckBoxCheckedIcon : CheckBoxIcon}
                  className={cn("pui:relative", selected && "pui:text-primary")}
                />
              </>
            ) : (
              <Icon source={CheckIcon} className="pui:pointer-events-none" />
            )}
          </span>
        )}
      />
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pui:pointer-events-none pui:-mx-1 pui:my-1 pui:h-px pui:bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "pui:top-0 pui:z-10 pui:flex pui:w-full pui:cursor-default pui:items-center pui:justify-center pui:bg-popover pui:py-1 pui:[&_svg:not(.pagopa-icon)]:size-4",
        className,
      )}
      {...props}
    >
      <Icon source={ChevronUpIcon} />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "pui:bottom-0 pui:z-10 pui:flex pui:w-full pui:cursor-default pui:items-center pui:justify-center pui:bg-popover pui:py-1 pui:[&_svg:not(.pagopa-icon)]:size-4",
        className,
      )}
      {...props}
    >
      <Icon source={ChevronDownIcon} />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
