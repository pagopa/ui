"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

import { type ChangeEventDetails, type ElementProps } from "./props"

/** The value that identifies a tab and its panel. */
export type TabsValue = string | number | null

/** Props of the `Tabs` root. */
export type TabsProps = ElementProps<"div"> & {
  /** The active tab. Use with `onValueChange`; `null` leaves none active. */
  value?: TabsValue
  /** The tab active at first render. Use without `value`. @default 0 */
  defaultValue?: TabsValue
  /** Layout flow the tabs follow. @default "horizontal" */
  orientation?: "horizontal" | "vertical"
  /** Called when the active tab changes. */
  onValueChange?: (value: TabsValue, details: ChangeEventDetails) => void
}

function Tabs({ className, orientation = "horizontal", ...props }: TabsProps) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn("group/tabs flex gap-2 data-horizontal:flex-col", className)}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  // `justify-center-safe`: the list stays centred while it fits and falls back to
  // the start when a narrow viewport makes it wider than its container, so the
  // first tab never hides off the unreachable edge of the scroll area.
  "group/tabs-list inline-flex w-fit items-center justify-center-safe text-muted-foreground group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "rounded-lg bg-muted p-1",
        line: "rounded-none bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

/** Props of `TabsList`. */
export type TabsListProps = ElementProps<"div"> &
  VariantProps<typeof tabsListVariants> & {
    /** Whether arrow keys change the active tab as focus moves. @default false */
    activateOnFocus?: boolean
    /** Whether arrow keys wrap around at the ends of the list. @default true */
    loopFocus?: boolean
  }

function TabsList({ className, variant = "default", ...props }: TabsListProps) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

/** Props of `TabsTrigger`. */
export type TabsTriggerProps = ElementProps<"button"> & {
  /** The value this trigger activates. */
  value: TabsValue
  /** Whether the trigger ignores interaction. @default false */
  disabled?: boolean
  /**
   * Whether replacing the element with `render` keeps native `<button>`
   * behaviour. @default true
   */
  nativeButton?: boolean
}

function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md border border-transparent px-4 py-2 text-body-big-sb whitespace-nowrap text-muted-foreground transition-colors group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-background data-active:text-foreground",
        "after:absolute after:bg-primary after:opacity-0 group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-0 group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:right-0 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:after:bg-border group-data-[variant=line]/tabs-list:after:opacity-100 group-data-[variant=line]/tabs-list:data-active:after:bg-primary",
        "data-active:text-primary",
        className,
      )}
      {...props}
    />
  )
}

/** Props of `TabsContent`, the panel of one tab. */
export type TabsContentProps = ElementProps<"div"> & {
  /** The value of the tab this panel belongs to. */
  value: TabsValue
  /** Whether the panel stays in the DOM while hidden. @default false */
  keepMounted?: boolean
}

function TabsContent({ className, ...props }: TabsContentProps) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-label-mini outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
