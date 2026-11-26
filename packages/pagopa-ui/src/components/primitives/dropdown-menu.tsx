"use client"

import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { usePortalHost } from "@/lib/ui-provider"
import { cn } from "@/lib/cn"
import { CheckIcon, ChevronRightIcon } from "./icons"

function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />
}

function DropdownMenuPortal({ container, ...props }: MenuPrimitive.Portal.Props) {
  const portalHost = usePortalHost()
  return (
    <MenuPrimitive.Portal
      container={container ?? portalHost}
      data-slot="dropdown-menu-portal"
      {...props}
    />
  )
}

function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />
}

function DropdownMenuContent({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  const portalHost = usePortalHost()
  return (
    <MenuPrimitive.Portal container={portalHost}>
      <MenuPrimitive.Positioner
        className="pui:isolate pui:z-50 pui:outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "pui:z-50 pui:max-h-(--available-height) pui:w-(--anchor-width) pui:min-w-32 pui:origin-(--transform-origin) pui:overflow-x-hidden pui:overflow-y-auto pui:rounded-lg pui:bg-popover pui:p-1 pui:text-popover-foreground pui:shadow-16 pui:duration-100 pui:outline-none pui:data-[side=bottom]:slide-in-from-top-2 pui:data-[side=inline-end]:slide-in-from-left-2 pui:data-[side=inline-start]:slide-in-from-right-2 pui:data-[side=left]:slide-in-from-right-2 pui:data-[side=right]:slide-in-from-left-2 pui:data-[side=top]:slide-in-from-bottom-2 pui:data-open:animate-in pui:data-open:fade-in-0 pui:data-open:zoom-in-95 pui:data-closed:animate-out pui:data-closed:overflow-hidden pui:data-closed:fade-out-0 pui:data-closed:zoom-out-95",
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: MenuPrimitive.GroupLabel.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "pui:px-1.5 pui:py-1 pui:text-caption-sb pui:text-muted-foreground pui:data-inset:pl-7",
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: MenuPrimitive.Item.Props & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "group/dropdown-menu-item pui:relative pui:flex pui:cursor-default pui:items-center pui:gap-1.5 pui:rounded-md pui:px-1.5 pui:py-1 pui:text-label-mini pui:focus:outline-hidden pui:select-none pui:focus:bg-accent pui:focus:text-accent-foreground pui:not-data-[variant=destructive]:focus:**:text-accent-foreground pui:data-inset:pl-7 pui:data-[variant=destructive]:text-destructive pui:data-[variant=destructive]:focus:bg-destructive/10 pui:data-[variant=destructive]:focus:text-destructive pui:data-disabled:pointer-events-none pui:data-disabled:opacity-50 pui:[&_svg]:pointer-events-none pui:[&_svg]:shrink-0 pui:[&_svg:not([class*='size-'])]:size-4 pui:data-[variant=destructive]:*:[svg]:text-destructive",
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(
        "pui:flex pui:cursor-default pui:items-center pui:gap-1.5 pui:rounded-md pui:px-1.5 pui:py-1 pui:text-label-mini pui:focus:outline-hidden pui:select-none pui:focus:bg-accent pui:focus:text-accent-foreground pui:not-data-[variant=destructive]:focus:**:text-accent-foreground pui:data-inset:pl-7 pui:data-popup-open:bg-accent pui:data-popup-open:text-accent-foreground pui:data-open:bg-accent pui:data-open:text-accent-foreground pui:[&_svg]:pointer-events-none pui:[&_svg]:shrink-0 pui:[&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="pui:ml-auto" />
    </MenuPrimitive.SubmenuTrigger>
  )
}

function DropdownMenuSubContent({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 0,
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      className={cn("pui:w-auto pui:min-w-24", className)}
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  indicator,
  indicatorClassName,
  ...props
}: MenuPrimitive.CheckboxItem.Props & {
  inset?: boolean
  indicator?: React.ReactNode | ((checked: boolean) => React.ReactNode)
  indicatorClassName?: string
}) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset}
      className={cn(
        "pui:relative pui:flex pui:cursor-default pui:items-center pui:gap-1.5 pui:rounded-md pui:py-1 pui:pr-8 pui:pl-1.5 pui:text-label-mini pui:focus:outline-hidden pui:select-none pui:focus:bg-accent pui:focus:text-accent-foreground pui:focus:**:text-accent-foreground pui:data-inset:pl-7 pui:data-disabled:pointer-events-none pui:data-disabled:opacity-50 pui:[&_svg]:pointer-events-none pui:[&_svg]:shrink-0 pui:[&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      checked={checked}
      {...props}
    >
      <span
        className={cn(
          "pui:pointer-events-none pui:absolute pui:right-2 pui:flex pui:items-center pui:justify-center",
          indicatorClassName,
        )}
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        {typeof indicator === "function" ? (
          <MenuPrimitive.CheckboxItemIndicator
            keepMounted
            render={(indicatorProps, { checked: isChecked }) => (
              <span
                {...indicatorProps}
                className={cn(
                  "pui:inline-flex pui:size-full pui:items-center pui:justify-center",
                  indicatorProps.className,
                )}
              >
                {indicator(isChecked)}
              </span>
            )}
          />
        ) : (
          <MenuPrimitive.CheckboxItemIndicator>
            {indicator ?? <CheckIcon />}
          </MenuPrimitive.CheckboxItemIndicator>
        )}
      </span>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioGroup({ ...props }: MenuPrimitive.RadioGroup.Props) {
  return <MenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />
}

function DropdownMenuRadioItem({
  className,
  children,
  inset,
  ...props
}: MenuPrimitive.RadioItem.Props & {
  inset?: boolean
}) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      data-inset={inset}
      className={cn(
        "pui:relative pui:flex pui:cursor-default pui:items-center pui:gap-1.5 pui:rounded-md pui:py-1 pui:pr-8 pui:pl-1.5 pui:text-label-mini pui:focus:outline-hidden pui:select-none pui:focus:bg-accent pui:focus:text-accent-foreground pui:focus:**:text-accent-foreground pui:data-inset:pl-7 pui:data-disabled:pointer-events-none pui:data-disabled:opacity-50 pui:[&_svg]:pointer-events-none pui:[&_svg]:shrink-0 pui:[&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span
        className="pui:pointer-events-none pui:absolute pui:right-2 pui:flex pui:items-center pui:justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        <MenuPrimitive.RadioItemIndicator>
          <CheckIcon />
        </MenuPrimitive.RadioItemIndicator>
      </span>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

function DropdownMenuSeparator({ className, ...props }: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("pui:-mx-1 pui:my-1 pui:h-px pui:bg-border", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "pui:ml-auto pui:text-caption pui:tracking-widest pui:text-muted-foreground pui:group-focus/dropdown-menu-item:text-accent-foreground",
        className,
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
}
