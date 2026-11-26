"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

function Tabs({ className, orientation = "horizontal", ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("group/tabs pui:flex pui:gap-2 pui:data-horizontal:flex-col", className)}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  // `justify-center-safe`: the list stays centred while it fits and falls back to
  // the start when a narrow viewport makes it wider than its container, so the
  // first tab never hides off the unreachable edge of the scroll area.
  "group/tabs-list pui:inline-flex pui:w-fit pui:items-center pui:justify-center-safe pui:text-muted-foreground pui:group-data-vertical/tabs:h-fit pui:group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "pui:rounded-lg pui:bg-muted pui:p-1",
        line: "pui:rounded-none pui:bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "pui:relative pui:inline-flex pui:min-h-12 pui:flex-1 pui:items-center pui:justify-center pui:gap-2 pui:rounded-md pui:border pui:border-transparent pui:px-4 pui:py-2 pui:text-body-big-sb pui:whitespace-nowrap pui:text-muted-foreground pui:transition-colors pui:group-data-vertical/tabs:w-full pui:group-data-vertical/tabs:justify-start pui:hover:text-foreground pui:focus-visible:outline-2 pui:focus-visible:-outline-offset-2 pui:focus-visible:outline-ring pui:disabled:pointer-events-none pui:disabled:opacity-50 pui:aria-disabled:pointer-events-none pui:aria-disabled:opacity-50 pui:[&_svg]:pointer-events-none pui:[&_svg]:shrink-0 pui:[&_svg:not([class*='size-'])]:size-6",
        "pui:group-data-[variant=line]/tabs-list:bg-transparent pui:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "pui:data-active:bg-background pui:data-active:text-foreground",
        "pui:after:absolute pui:after:bg-primary pui:after:opacity-0 pui:group-data-horizontal/tabs:after:inset-x-0 pui:group-data-horizontal/tabs:after:bottom-0 pui:group-data-horizontal/tabs:after:h-0.5 pui:group-data-vertical/tabs:after:inset-y-0 pui:group-data-vertical/tabs:after:right-0 pui:group-data-vertical/tabs:after:w-0.5 pui:group-data-[variant=line]/tabs-list:after:bg-border pui:group-data-[variant=line]/tabs-list:after:opacity-100 pui:group-data-[variant=line]/tabs-list:data-active:after:bg-primary",
        "pui:data-active:text-primary",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("pui:flex-1 pui:text-label-mini pui:outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
