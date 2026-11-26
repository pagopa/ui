"use client"

import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"
import { DayButton, DayPicker, Nav } from "react-day-picker"
import { it } from "react-day-picker/locale"

export type { DateRange } from "react-day-picker"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

function Calendar({
  className,
  classNames,
  components,
  locale = it,
  showOutsideDays = false,
  weekStartsOn = 0,
  navLayout = "after",
  ...props
}: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={locale}
      showOutsideDays={showOutsideDays}
      weekStartsOn={weekStartsOn}
      navLayout={navLayout}
      className={cn("pui:relative pui:min-w-0 pui:px-2 pui:text-body", className)}
      classNames={{
        months: "pui:flex pui:flex-wrap pui:gap-6",
        month: "pui:relative pui:flex pui:min-w-0 pui:flex-1 pui:flex-col pui:gap-2",
        month_caption:
          "pui:-mx-2 pui:flex pui:items-center pui:border-b pui:border-secondary pui:px-4 pui:py-2 pui:pr-22 pui:text-body-big-sb",
        caption_label: "",
        nav: "pui:absolute pui:top-2 pui:right-2 pui:flex pui:items-center pui:gap-1",
        button_previous:
          "pui:relative pui:flex pui:size-6 pui:items-center pui:justify-center pui:rounded-md pui:text-primary pui:after:absolute pui:after:-inset-2.5 pui:after:content-[''] pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring pui:disabled:pointer-events-none pui:disabled:opacity-50",
        button_next:
          "pui:relative pui:flex pui:size-6 pui:items-center pui:justify-center pui:rounded-md pui:text-primary pui:after:absolute pui:after:-inset-2.5 pui:after:content-[''] pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring pui:disabled:pointer-events-none pui:disabled:opacity-50",
        month_grid: "pui:w-full pui:table-fixed pui:border-collapse",
        weekday: "pui:pb-2 pui:text-caption-sb pui:text-muted-foreground",
        day: "pui:h-11 pui:p-0 pui:text-center",
        day_button:
          "pui:relative pui:flex pui:h-11 pui:w-full pui:items-center pui:justify-center pui:rounded-full pui:outline-none pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-1 pui:focus-visible:outline-ring pui:disabled:cursor-not-allowed",
        hidden: "pui:invisible",
        outside: "pui:text-muted-foreground",
        footer: "pui:sr-only",
        ...classNames,
      }}
      components={{
        // Month paging is a widget control, not a page navigation landmark.
        Nav: (navProps) => <Nav {...navProps} role="presentation" aria-label={undefined} />,
        Chevron: ({ orientation, className: iconClassName }) => (
          <PagoPAIcon name="chevron" variant={orientation ?? "down"} className={iconClassName} />
        ),
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  )
}

function CalendarDayButton({
  day,
  modifiers,
  children,
  ...props
}: ComponentProps<typeof DayButton>) {
  const endpoint = modifiers.range_start || modifiers.range_end
  const rangeBand =
    modifiers.range_middle || (endpoint && !(modifiers.range_start && modifiers.range_end))

  return (
    <DayButton day={day} modifiers={modifiers} {...props}>
      {rangeBand ? (
        <span
          aria-hidden="true"
          className={cn(
            "pui:pointer-events-none pui:absolute pui:inset-y-1 pui:bg-selection-soft pui:forced-colors:bg-[Highlight] pui:forced-colors:forced-color-adjust-none",
            modifiers.range_start && "pui:left-1/2 pui:right-0",
            modifiers.range_end && "pui:left-0 pui:right-1/2",
            modifiers.range_middle && "pui:inset-x-0",
          )}
        />
      ) : null}
      <span
        className={cn(
          "pui:relative pui:inline-flex pui:aspect-square pui:w-9 pui:max-w-full pui:items-center pui:justify-center pui:rounded-full pui:border pui:border-transparent",
          modifiers.selected && !modifiers.range_middle
            ? "pui:bg-primary pui:text-body-sb pui:text-primary-foreground pui:forced-colors:bg-[Highlight] pui:forced-colors:text-[HighlightText] pui:forced-colors:forced-color-adjust-none"
            : "pui:text-foreground",
          modifiers.today && !modifiers.selected && "pui:border-primary pui:text-primary",
          modifiers.range_middle &&
            "pui:text-muted-foreground pui:forced-colors:text-[HighlightText] pui:forced-colors:forced-color-adjust-none",
          modifiers.disabled && "pui:text-muted-foreground",
        )}
      >
        {children}
      </span>
    </DayButton>
  )
}

export { Calendar }
