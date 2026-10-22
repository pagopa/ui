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
      className={cn("relative min-w-0 px-2 text-body", className)}
      classNames={{
        months: "flex flex-wrap gap-6",
        month: "relative flex min-w-0 flex-1 flex-col gap-2",
        month_caption:
          "-mx-2 flex items-center border-b border-secondary px-4 py-2 pr-22 text-body-big-sb",
        caption_label: "",
        nav: "absolute top-2 right-2 flex items-center gap-1",
        button_previous:
          "relative flex size-6 items-center justify-center rounded-md text-primary after:absolute after:-inset-2.5 after:content-[''] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
        button_next:
          "relative flex size-6 items-center justify-center rounded-md text-primary after:absolute after:-inset-2.5 after:content-[''] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
        month_grid: "w-full table-fixed border-collapse",
        weekday: "pb-2 text-caption-sb text-muted-foreground",
        day: "h-11 p-0 text-center",
        day_button:
          "relative flex h-11 w-full items-center justify-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-not-allowed",
        hidden: "invisible",
        outside: "text-muted-foreground",
        footer: "sr-only",
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
            "pointer-events-none absolute inset-y-1 bg-selection-soft forced-colors:bg-[Highlight] forced-colors:forced-color-adjust-none",
            modifiers.range_start && "left-1/2 right-0",
            modifiers.range_end && "left-0 right-1/2",
            modifiers.range_middle && "inset-x-0",
          )}
        />
      ) : null}
      <span
        className={cn(
          "relative inline-flex aspect-square w-9 max-w-full items-center justify-center rounded-full border border-transparent",
          modifiers.selected && !modifiers.range_middle
            ? "bg-primary text-body-sb text-primary-foreground forced-colors:bg-[Highlight] forced-colors:text-[HighlightText] forced-colors:forced-color-adjust-none"
            : "text-foreground",
          modifiers.today && !modifiers.selected && "border-primary text-primary",
          modifiers.range_middle &&
            "text-muted-foreground forced-colors:text-[HighlightText] forced-colors:forced-color-adjust-none",
          modifiers.disabled && "text-muted-foreground",
        )}
      >
        {children}
      </span>
    </DayButton>
  )
}

export { Calendar }
