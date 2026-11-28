"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import {
  Accordion as AccordionPrimitive,
  AccordionContent,
  AccordionItem as AccordionItemPrimitive,
  AccordionTrigger,
} from "@/components/primitives/accordion"
import { Up as ChevronUp } from "@/components/icons/generated/chevron"
import { Icon } from "@/components/icons/icon"

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
  label: labelProp,
}: {
  item: AccordionItemData
  /** Announced text of the skeleton. @default messages.accordion.label */
  label?: string
}) {
  const t = useMessages("accordion")
  const label = labelProp ?? t.label

  return (
    <div
      data-slot="accordion-skeleton"
      aria-busy="true"
      className={cn(
        "pui:rounded-lg pui:border pui:bg-background pui:px-6 pui:py-6",
        "pui:border-border",
      )}
    >
      <span className="pui:sr-only">{label}</span>
      <div aria-hidden="true" className="pui:flex pui:items-start pui:justify-between pui:gap-3">
        <span className="pui:flex pui:min-w-0 pui:flex-1 pui:items-start pui:gap-2">
          {item.icon ? (
            <span className="pui:flex pui:size-6 pui:shrink-0 pui:items-center pui:justify-center pui:text-choice-icon pui:[&>svg:not(.pagopa-icon)]:size-6">
              {item.icon}
            </span>
          ) : null}
          <span className="pui:flex pui:min-w-0 pui:flex-1 pui:flex-col pui:items-start pui:gap-1">
            <span className="pui:min-w-0 pui:text-body-sb">{item.title}</span>
            {item.chip}
          </span>
        </span>
        <Icon source={ChevronUp} size={24} className="pui:text-choice-icon" />
      </div>
      <div aria-hidden="true" className="pui:mt-8">
        {Array.from({ length: SKELETON_ROWS }, (_, index) => (
          <div key={index}>
            {index > 0 ? <div className="pui:h-px pui:bg-border" /> : null}
            <div className="pui:flex pui:flex-col pui:gap-3 pui:py-3">
              <div className="pui:flex pui:flex-col pui:gap-1.5">
                <span className="pui:h-5.5 pui:w-25 pui:rounded-full pui:bg-secondary" />
                <span className="pui:h-4 pui:w-50 pui:rounded-lg pui:bg-secondary" />
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
        "pui:rounded-lg pui:border pui:bg-background pui:px-6 pui:py-6 pui:data-disabled:bg-secondary",
        className,
      )}
    >
      {/* `border-0`: the primitive's 1px transparent border is layout padding on
          top of the source's 50px header (24 icon + gap 12 + 24 chevron box,
          title/chip stacked with a 4px gap). The keyboard perimeter is the
          primitive's ring, so dropping the border keeps focus visible. */}
      <AccordionTrigger className="pui:min-h-12 pui:gap-3 pui:border-0 pui:px-0 pui:py-0 pui:text-body-sb pui:hover:no-underline pui:aria-disabled:opacity-100 pui:data-disabled:opacity-100 pui:data-disabled:[&_[data-slot=accordion-trigger-icon]]:text-choice-icon">
        <span className="pui:flex pui:min-w-0 pui:flex-1 pui:items-start pui:gap-2">
          {item.icon ? (
            <span
              aria-hidden="true"
              className="pui:flex pui:size-6 pui:shrink-0 pui:items-center pui:justify-center pui:text-choice-icon pui:[&>svg:not(.pagopa-icon)]:size-6"
            >
              {item.icon}
            </span>
          ) : null}
          <span className="pui:flex pui:min-w-0 pui:flex-1 pui:flex-col pui:items-start pui:gap-1">
            <span className="pui:min-w-0">{item.title}</span>
            {item.chip}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="pui:pb-0 pui:text-body pui:text-muted-foreground">
        {item.description ? <div className="pui:mt-2">{item.description}</div> : null}
        <div className={cn(item.description ? "pui:mt-8" : "pui:mt-2")}>{item.content}</div>
      </AccordionContent>
    </AccordionItemPrimitive>
  )
}

/**
 * Props of {@link Accordion}. The controlled (`value` + `onValueChange`) and
 * uncontrolled (`defaultValue`) modes share one lifecycle; `ref`, `className`
 * and the standard HTML attributes of a `div` land on the root.
 */
interface AccordionProps extends Omit<
  React.ComponentProps<"div">,
  "children" | "className" | "aria-label"
> {
  /** The sections, in display order. */
  items: AccordionItemData[]
  /** Ids of the open sections; the caller owns them. */
  value?: string[]
  /** Ids of the sections open at mount when `value` is omitted. */
  defaultValue?: string[]
  /**
   * Runs when a header asks to open or close its section: a click, Enter or
   * Space, with the ids of the sections open afterwards.
   */
  onValueChange?: (value: string[]) => void
  /** Whether several sections stay open at the same time. @default false */
  multiple?: boolean
  /** Classes of the root, merged with the root's own. */
  className?: string
  /** Name of the accordion landmark. @default messages.accordion.ariaLabel */
  "aria-label"?: string
  /** Announced text of a loading item. @default messages.accordion.loadingLabel */
  loadingLabel?: string
  /** The root element. */
  ref?: React.Ref<HTMLDivElement>
}

function Accordion({
  items,
  value,
  defaultValue,
  onValueChange,
  multiple,
  className,
  "aria-label": ariaLabelProp,
  loadingLabel: loadingLabelProp,
  ref,
  ...rootProps
}: AccordionProps) {
  const t = useMessages("accordion")
  const ariaLabel = ariaLabelProp ?? t.ariaLabel
  const loadingLabel = loadingLabelProp ?? t.loadingLabel

  return (
    <AccordionPrimitive
      ref={ref}
      data-slot="accordion"
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      multiple={multiple}
      aria-label={ariaLabel}
      className={cn("pui:grid pui:gap-3", className)}
      {...rootProps}
    >
      {items.map((item) => (
        <AccordionItem key={item.id} item={item} loadingLabel={loadingLabel} />
      ))}
    </AccordionPrimitive>
  )
}

export { Accordion, type AccordionProps }
