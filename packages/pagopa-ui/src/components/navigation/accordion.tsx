import * as React from "react"
import { cn } from "@/lib/cn"

import {
  Accordion as AccordionPrimitive,
  AccordionContent,
  AccordionItem as AccordionItemPrimitive,
  AccordionTrigger,
} from "@/components/primitives/accordion"

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

function AccordionSkeleton({ label = "Caricamento in corso" }: { label?: string }) {
  return (
    <div
      aria-busy="true"
      className={cn("grid gap-4 rounded-lg border bg-background px-6 py-6", "border-border")}
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="flex items-center justify-between gap-4">
        <span className="h-4 w-2/3 rounded-lg bg-border" />
        <span className="size-6 rounded-lg bg-border" />
      </div>
      <div aria-hidden="true" className="grid gap-2">
        <span className="h-4 w-full rounded-lg bg-border" />
        <span className="h-4 w-5/6 rounded-lg bg-border" />
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
  if (item.skeleton) return <AccordionSkeleton label={loadingLabel} />
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
      <AccordionTrigger className="min-h-12 gap-3 border-0 px-0 py-0 text-body-sb hover:no-underline data-disabled:[&_[data-slot=accordion-trigger-icon]]:text-choice-icon">
        <span className="flex min-w-0 items-start gap-2 group-data-[disabled]/accordion-trigger:opacity-50">
          {item.icon ? (
            <span
              aria-hidden="true"
              className="flex size-6 shrink-0 items-center justify-center text-choice-icon [&>svg]:size-6"
            >
              {item.icon}
            </span>
          ) : null}
          <span className="flex min-w-0 flex-col items-start gap-1">
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
