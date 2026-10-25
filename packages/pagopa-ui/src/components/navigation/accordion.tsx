import * as React from "react"
import { cn } from "@/lib/cn"

import {
  Accordion as AccordionPrimitive,
  AccordionContent,
  AccordionItem as AccordionItemPrimitive,
  AccordionTrigger,
} from "@/components/primitives/accordion"
import { ChevronUpIcon } from "@/components/primitives/icons"

export interface AccordionItemData {
  id: string
  title: React.ReactNode
  content: React.ReactNode
  /** Header icon; decorative. */
  icon?: React.ReactNode
  /** Header chip. */
  chip?: React.ReactNode
  /** Support paragraph of the header. */
  description?: React.ReactNode
  disabled?: boolean
  /** Skeleton state while the item loads. */
  skeleton?: boolean
}

// The loading state is the item's own skeleton: the source draws the header
// (icon, title, chip and an open chevron) above six placeholder rows separated
// by dividers, not an empty card.
const SKELETON_ROWS = 6

function AccordionSkeleton({
  item,
  label = "Caricamento in corso",
}: {
  item: AccordionItemData
  label?: string
}) {
  return (
    <div
      data-slot="accordion-skeleton"
      aria-busy="true"
      className={cn("rounded-lg border bg-background px-6 py-6", "border-border")}
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-1 items-start gap-2">
          {item.icon ? (
            <span className="flex size-6 shrink-0 items-center justify-center text-choice-icon [&>svg]:size-6">
              {item.icon}
            </span>
          ) : null}
          <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <span className="min-w-0 text-body-sb">{item.title}</span>
            {item.chip}
          </span>
        </span>
        <ChevronUpIcon className="size-6 shrink-0 text-choice-icon" />
      </div>
      <div aria-hidden="true" className="mt-8">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <div key={index}>
            {index > 0 ? <div className="h-px bg-border" /> : null}
            <div className="flex flex-col gap-3 py-3">
              <div className="flex flex-col gap-1.5">
                <span className="h-5.5 w-25 rounded-full bg-secondary" />
                <span className="h-4 w-50 rounded-lg bg-secondary" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AccordionItem({
  item,
  className,
  loadingLabel,
}: {
  item: AccordionItemData
  className?: string
  loadingLabel?: string
}) {
  if (item.skeleton) return <AccordionSkeleton item={item} label={loadingLabel} />
  return (
    <AccordionItemPrimitive
      value={item.id}
      disabled={item.disabled}
      className={cn(
        "rounded-lg border bg-background px-6 py-6 data-disabled:bg-secondary",
        className,
      )}
    >
      {/* `border-0`: the primitive's 1px transparent border is layout padding on
          top of the source's 50px header (24 icon + gap 12 + 24 chevron box,
          title/chip stacked with a 4px gap). The keyboard perimeter is the
          primitive's ring, so dropping the border keeps focus visible. */}
      <AccordionTrigger className="min-h-12 gap-3 border-0 px-0 py-0 text-body-sb hover:no-underline aria-disabled:opacity-100 data-disabled:opacity-100 data-disabled:[&_[data-slot=accordion-trigger-icon]]:text-choice-icon">
        <span className="flex min-w-0 flex-1 items-start gap-2">
          {item.icon ? (
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center text-choice-icon [&>svg]:size-6"
            >
              {item.icon}
            </span>
          ) : null}
          <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <span className="min-w-0">{item.title}</span>
            {item.chip}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="pb-0 text-body text-muted-foreground">
        {item.description ? <div className="mt-2">{item.description}</div> : null}
        <div className={cn(item.description ? "mt-8" : "mt-2")}>{item.content}</div>
      </AccordionContent>
    </AccordionItemPrimitive>
  )
}

function Accordion({
  items,
  defaultValue,
  className,
  "aria-label": ariaLabel = "Approfondimenti",
  loadingLabel = "Caricamento in corso",
}: {
  items: AccordionItemData[]
  defaultValue?: string
  className?: string
  "aria-label"?: string
  /** Announced text of a loading item. @default "Caricamento in corso" */
  loadingLabel?: string
}) {
  return (
    <AccordionPrimitive
      defaultValue={defaultValue ? [defaultValue] : undefined}
      aria-label={ariaLabel}
      className={cn("grid gap-3", className)}
    >
      {items.map((item) => (
        <AccordionItem key={item.id} item={item} loadingLabel={loadingLabel} />
      ))}
    </AccordionPrimitive>
  )
}

export { Accordion }
