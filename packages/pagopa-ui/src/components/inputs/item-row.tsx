"use client"

import * as React from "react"
import { cn } from "@/lib/cn"

export interface ItemRowContent {
  label: string
  description?: string
  leading?: React.ReactNode
  chip?: React.ReactNode
}

type RowAttributes = Pick<
  React.ComponentProps<"div">,
  "aria-label" | "aria-describedby" | "className" | "children"
>

export function ItemRow({
  label,
  description,
  leading,
  leadingAlignment = "center",
  chip,
  multiple = false,
  render,
}: ItemRowContent & {
  leadingAlignment?: "center" | "label"
  multiple?: boolean
  render: (attributes: RowAttributes) => React.ReactNode
}) {
  const id = React.useId()
  const descriptionId = `${id}-description`
  const chipId = `${id}-chip`
  const rich = Boolean(description || leading || chip)
  const details = [description ? descriptionId : undefined, chip ? chipId : undefined]
    .filter(Boolean)
    .join(" ")
  const status = chip ? (
    <span
      id={chipId}
      inert
      className={cn(
        "pui:pointer-events-none pui:inline-flex pui:shrink-0 pui:justify-self-start",
        multiple && leading && "pui:col-start-2",
      )}
    >
      {chip}
    </span>
  ) : null

  return render({
    "aria-label": label,
    "aria-describedby": details || undefined,
    className: cn(
      rich &&
        "pui:rounded-none pui:py-3 pui:pl-4 pui:text-foreground pui:focus:bg-selection-soft pui:focus:text-foreground pui:data-selected:bg-selection-soft pui:data-highlighted:bg-selection-soft pui:data-highlighted:text-foreground pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:-outline-offset-2 pui:focus-visible:outline-ring pui:[&_[data-slot=item-row-leading]>svg]:size-6!",
    ),
    children: rich ? (
      <span className="pui:flex pui:min-w-0 pui:flex-1 pui:items-center pui:gap-2 pui:whitespace-normal">
        <span
          className={cn(
            "pui:grid pui:min-w-0 pui:flex-1 pui:gap-x-2 pui:gap-y-1",
            leading && "pui:grid-cols-[auto_minmax(0,1fr)]",
          )}
        >
          {leading ? (
            <span
              aria-hidden="true"
              inert
              data-slot="item-row-leading"
              className={cn(
                "pui:pointer-events-none pui:inline-flex pui:shrink-0 pui:items-center pui:gap-2 pui:self-center",
                leadingAlignment === "label" && "pui:h-lh pui:self-start pui:leading-[1.375]",
                multiple && chip && leadingAlignment === "center" && "pui:row-span-2",
              )}
            >
              {leading}
            </span>
          ) : null}
          <span className="pui:flex pui:min-w-0 pui:flex-col pui:gap-0.5">
            <span
              data-slot="item-row-label"
              className="pui:text-body-sb pui:[overflow-wrap:anywhere]"
            >
              {label}
            </span>
            {description ? (
              <span
                id={descriptionId}
                data-slot="item-row-description"
                className="pui:text-label-mini pui:text-muted-foreground pui:[overflow-wrap:anywhere]"
              >
                {description}
              </span>
            ) : null}
          </span>
          {multiple ? status : null}
        </span>
        {!multiple ? status : null}
      </span>
    ) : (
      label
    ),
  })
}
