import * as React from "react"
import { cn } from "@/lib/cn"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

export interface StepperItem {
  label: string
  description?: string
  status?: "complete" | "current" | "upcoming"
}

function defaultStatusLabel(status: StepperItem["status"]) {
  return status === "complete"
    ? "Completato"
    : status === "current"
      ? "Passaggio corrente"
      : "Da completare"
}

interface StepperLabels {
  /** Accessible name of each progress list. @default "Avanzamento" */
  navigationLabel?: string
  /** Announced completion text of a finished step. @default "Completato:" */
  completedLabel?: string
  /** Announced status of a step; the caller owns the phrase. @default built-in Italian status */
  statusLabel?: (status: StepperItem["status"]) => string
  /** Announced status on the numbered badge; end it with the punctuation you want. @default built-in Italian status with ":" */
  indicatorLabel?: (status: StepperItem["status"]) => string
  /**
   * Complete announcement of a step, from its data: the caller owns word
   * order, plurals and grammar. @default built-in Italian step sentence
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
  completedLabel = "Completato:",
  indicatorLabel = (status) => `${defaultStatusLabel(status)}:`,
}: {
  item: StepperItem
  index: number
  labelled?: boolean
  completedLabel?: string
  indicatorLabel?: (status: StepperItem["status"]) => string
}) {
  // The source slots every marker in 24x24 with the 20px visual centred
  // (`Base Step Elements` / `Number` + `Background`); the slot is the row's
  // rhythm, so the DOM keeps it too.
  return (
    <span className="relative z-10 flex size-6 shrink-0 items-center justify-center">
      {item.status === "complete" ? (
        <>
          {labelled ? <span className="sr-only">{completedLabel} </span> : null}
          <PagoPAIcon name="check_circle" aria-hidden="true" className="size-5 text-primary" />
        </>
      ) : (
        <span
          className={cn(
            "flex size-5 items-center justify-center rounded-full text-caption-sb",
            item.status === "current"
              ? "bg-primary text-primary-foreground"
              : "bg-border-strong text-muted-soft",
          )}
        >
          {labelled ? <span className="sr-only">{indicatorLabel(item.status)}</span> : null}
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
        "hidden h-1 flex-1 rounded-full tablet:block",
        complete ? "bg-primary" : "bg-border-strong",
        className,
      )}
    />
  )
}

function Stepper({
  items,
  className,
  navigationLabel = "Avanzamento",
  completedLabel = "Completato:",
  statusLabel = defaultStatusLabel,
  indicatorLabel = (status) => `${defaultStatusLabel(status)}:`,
  stepLabel = ({ index, total, label, status }) =>
    `Passaggio ${index} di ${total}: ${label} — ${statusLabel(status)}`,
}: { items: StepperItem[]; className?: string } & StepperLabels) {
  const stepperStyle: React.CSSProperties & Record<`--${string}`, string | number> = {
    "--steps": items.length,
  }
  const current = items.find((item) => item.status === "current") ?? items[0]

  return (
    <div className={cn("grid gap-4", className)}>
      <div className="grid gap-4 tablet:hidden">
        <div className="grid w-fit gap-0.5">
          <p className="text-body-sb">{current?.label}</p>
          {current?.description ? (
            <p className="text-body-small text-muted-foreground">{current.description}</p>
          ) : null}
        </div>
        <ol aria-label={navigationLabel} className="flex items-center gap-1">
          {items.map((item, index) => (
            <React.Fragment key={item.label}>
              <li
                aria-current={item.status === "current" ? "step" : undefined}
                className="flex flex-none items-center"
              >
                <span className="sr-only">
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
                    "h-1 flex-1 rounded-full",
                    item.status === "complete" ? "bg-primary" : "bg-border-strong",
                  )}
                />
              ) : null}
            </React.Fragment>
          ))}
        </ol>
      </div>
      <ol
        aria-label={navigationLabel}
        className="hidden tablet:grid tablet:grid-cols-[repeat(var(--steps),minmax(0,1fr))]"
        style={stepperStyle}
      >
        {items.map((item, index) => (
          <li
            key={item.label}
            aria-current={item.status === "current" ? "step" : undefined}
            className="relative flex min-w-0 items-start"
          >
            {/* The source hugs the step to its copy and centres the marker over
                it: the line then runs from the copy edge to the next step. */}
            <div className="flex min-w-0 flex-col items-center gap-2">
              <div className="flex w-full justify-center">
                <StepIndicator
                  item={item}
                  index={index}
                  completedLabel={completedLabel}
                  indicatorLabel={indicatorLabel}
                />
              </div>
              <div className="grid min-w-0 max-w-full gap-0.5">
                <p className="text-body-sb">{item.label}</p>
                {item.description ? (
                  <p className="text-body-small text-muted-foreground">{item.description}</p>
                ) : null}
              </div>
            </div>
            {index < items.length - 1 ? (
              <Connector complete={item.status === "complete"} className="mt-2.5" />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  )
}

export { Stepper }
