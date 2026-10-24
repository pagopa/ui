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
        "pointer-events-none inline-flex shrink-0 justify-self-start",
        multiple && leading && "col-start-2",
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
        "rounded-none py-3 pl-4 text-foreground focus:bg-selection-soft focus:text-foreground data-selected:bg-selection-soft data-highlighted:bg-selection-soft data-highlighted:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-ring [&_[data-slot=item-row-leading]>svg]:size-6!",
    ),
    children: rich ? (
      <span className="flex min-w-0 flex-1 items-center gap-2 whitespace-normal">
        <span
          className={cn(
            "grid min-w-0 flex-1 gap-x-2 gap-y-1",
            leading && "grid-cols-[auto_minmax(0,1fr)]",
          )}
        >
          {leading ? (
            <span
              aria-hidden="true"
              inert
              data-slot="item-row-leading"
              className={cn(
                "pointer-events-none inline-flex shrink-0 items-center gap-2 self-center",
                leadingAlignment === "label" && "h-lh self-start leading-[1.375]",
                multiple && chip && leadingAlignment === "center" && "row-span-2",
              )}
            >
              {leading}
            </span>
          ) : null}
          <span className="flex min-w-0 flex-col gap-0.5">
            <span data-slot="item-row-label" className="text-body-sb [overflow-wrap:anywhere]">
              {label}
            </span>
            {description ? (
              <span
                id={descriptionId}
                data-slot="item-row-description"
                className="text-label-mini text-muted-foreground [overflow-wrap:anywhere]"
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
