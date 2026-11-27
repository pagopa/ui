"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"
import { Icon } from "@/components/icons/icon"
import { Default as CheckCircleIcon } from "@/components/icons/generated/check-circle"

export interface StepperItem {
  label: string
  description?: string
  status?: "complete" | "current" | "upcoming"
}

interface StepperLabels {
  /** Accessible name of each progress list. @default messages.stepper.navigationLabel */
  navigationLabel?: string
  /** Announced completion text of a finished step. @default messages.stepper.completedLabel */
  completedLabel?: string
  /** Announced status of a step; the caller owns the phrase. @default messages.stepper.statusLabel */
  statusLabel?: (status: StepperItem["status"]) => string
  /** Announced status on the numbered badge; end it with the punctuation you want. @default messages.stepper.indicatorLabel */
  indicatorLabel?: (status: StepperItem["status"]) => string
  /**
   * Complete announcement of a step, from its data: the caller owns word
   * order, plurals and grammar. @default messages.stepper.stepLabel
   */
  stepLabel?: (step: {
    index: number
    total: number
    label: string
    status?: StepperItem["status"]
  }) => string
}

function StepIndicator({
  item,
  index,
  labelled = true,
  completedLabel: completedLabelProp,
  indicatorLabel: indicatorLabelProp,
}: {
  item: StepperItem
  index: number
  labelled?: boolean
  completedLabel?: string
  indicatorLabel?: (status: StepperItem["status"]) => string
}) {
  const t = useMessages("stepper")
  const completedLabel = completedLabelProp ?? t.completedLabel
  const indicatorLabel = indicatorLabelProp ?? t.indicatorLabel

  // The source slots every marker in 24x24 with the 20px visual centred
  // (`Base Step Elements` / `Number` + `Background`); the slot is the row's
  // rhythm, so the DOM keeps it too.
  return (
    <span className="pui:relative pui:z-10 pui:flex pui:size-6 pui:shrink-0 pui:items-center pui:justify-center">
      {item.status === "complete" ? (
        <>
          {labelled ? <span className="pui:sr-only">{completedLabel} </span> : null}
          <Icon source={CheckCircleIcon} aria-hidden="true" className="pui:text-primary" />
        </>
      ) : (
        <span
          className={cn(
            "pui:flex pui:size-5 pui:items-center pui:justify-center pui:rounded-full pui:text-caption-sb",
            item.status === "current"
              ? "pui:bg-primary pui:text-primary-foreground"
              : // The source pairs `muted-soft` with this disc: 3.66:1 on
                // `border-strong`, below WCAG AA for the 12px number. The
                // darker muted step reads the same and reaches 4.59:1.
                "pui:bg-border-strong pui:text-muted-foreground",
          )}
        >
          {labelled ? <span className="pui:sr-only">{indicatorLabel(item.status)}</span> : null}
          {index + 1}
        </span>
      )}
    </span>
  )
}

function Connector({ complete, className }: { complete: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pui:hidden pui:h-1 pui:flex-1 pui:rounded-full pui:tablet:block",
        complete ? "pui:bg-primary" : "pui:bg-border-strong",
        className,
      )}
    />
  )
}

export type StepperProps = { items: StepperItem[]; className?: string } & StepperLabels

function Stepper({
  items,
  className,
  navigationLabel: navigationLabelProp,
  completedLabel: completedLabelProp,
  statusLabel: statusLabelProp,
  indicatorLabel: indicatorLabelProp,
  stepLabel: stepLabelProp,
}: StepperProps) {
  const t = useMessages("stepper")
  const navigationLabel = navigationLabelProp ?? t.navigationLabel
  const completedLabel = completedLabelProp ?? t.completedLabel
  const statusLabel = statusLabelProp ?? t.statusLabel
  const indicatorLabel = indicatorLabelProp ?? t.indicatorLabel
  const stepLabel = stepLabelProp ?? ((step) => t.stepLabel(step, statusLabel))

  const stepperStyle: React.CSSProperties & Record<`--${string}`, string | number> = {
    "--steps": items.length,
  }
  const current = items.find((item) => item.status === "current") ?? items[0]

  return (
    <div data-slot="stepper" className={cn("pui:grid pui:gap-4", className)}>
      <div className="pui:grid pui:gap-4 pui:tablet:hidden">
        <div className="pui:grid pui:w-fit pui:gap-0.5">
          <p className="pui:text-body-sb">{current?.label}</p>
          {current?.description ? (
            <p className="pui:text-body-small pui:text-muted-foreground">{current.description}</p>
          ) : null}
        </div>
        <ol aria-label={navigationLabel} className="pui:flex pui:items-center pui:gap-1">
          {items.map((item, index) => (
            <React.Fragment key={`${item.label}-${index}`}>
              <li
                aria-current={item.status === "current" ? "step" : undefined}
                className="pui:flex pui:flex-none pui:items-center"
              >
                <span className="pui:sr-only">
                  {stepLabel({
                    index: index + 1,
                    total: items.length,
                    label: item.label,
                    status: item.status,
                  })}
                </span>
                <StepIndicator item={item} index={index} labelled={false} />
              </li>
              {index < items.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "pui:h-1 pui:flex-1 pui:rounded-full",
                    item.status === "complete" ? "pui:bg-primary" : "pui:bg-border-strong",
                  )}
                />
              ) : null}
            </React.Fragment>
          ))}
        </ol>
      </div>
      <ol
        aria-label={navigationLabel}
        className="pui:hidden pui:tablet:grid pui:tablet:grid-cols-[repeat(var(--steps),minmax(0,1fr))]"
        style={stepperStyle}
      >
        {items.map((item, index) => (
          <li
            key={`${item.label}-${index}`}
            aria-current={item.status === "current" ? "step" : undefined}
            className="pui:relative pui:flex pui:min-w-0 pui:items-start"
          >
            {/* The source hugs the step to its copy and centres the marker over
                it: the line then runs from the copy edge to the next step. */}
            <div className="pui:flex pui:min-w-0 pui:flex-col pui:items-center pui:gap-2">
              <div className="pui:flex pui:w-full pui:justify-center">
                <StepIndicator
                  item={item}
                  index={index}
                  completedLabel={completedLabel}
                  indicatorLabel={indicatorLabel}
                />
              </div>
              <div className="pui:grid pui:min-w-0 pui:max-w-full pui:gap-0.5">
                <p className="pui:text-body-sb">{item.label}</p>
                {item.description ? (
                  <p className="pui:text-body-small pui:text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
              </div>
            </div>
            {index < items.length - 1 ? (
              <Connector complete={item.status === "complete"} className="pui:mt-2.5" />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  )
}

export { Stepper }
export type { StepperLabels }
