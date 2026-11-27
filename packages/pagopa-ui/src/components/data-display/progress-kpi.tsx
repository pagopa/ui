"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { Icon } from "@/components/icons/icon"
import { Default as CheckCircleIcon } from "@/components/icons/generated/check-circle"

import { progressPercentage } from "./progress-kpi-utils"

interface ProgressKpiRow {
  label?: string
  value: number
  total?: number
  completed?: boolean
}

function KpiBar({
  percentage,
  completed,
  className,
}: {
  percentage: number
  completed?: boolean
  className?: string
}) {
  const t = useMessages("progressKpi")
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
      aria-label={t.valueLabel(percentage)}
      className={cn("pui:w-full pui:overflow-hidden pui:rounded-2xl pui:bg-secondary", className)}
    >
      <div
        className={cn(
          "pui:h-full pui:rounded-2xl",
          completed ? "pui:bg-success" : "pui:bg-primary",
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

function KpiFooter({
  value,
  total,
  completed,
  locale,
}: {
  value: number
  total: number
  completed?: boolean
  locale: string
}) {
  return (
    <div data-slot="progress-kpi-footer" className="pui:flex pui:items-center pui:gap-0.5">
      <span className="pui:text-body-sb pui:text-foreground">{value.toLocaleString(locale)}</span>
      <span className="pui:text-label-mini pui:text-foreground">
        / {total.toLocaleString(locale)}
      </span>
      {completed ? <Icon source={CheckCircleIcon} size={16} className="pui:text-success" /> : null}
    </div>
  )
}

export interface ProgressKpiProps {
  label: string
  value: number
  total?: number
  /** Optional channel artwork. */
  channel?: React.ReactNode
  /** Optional informational action. */
  info?: React.ReactNode
  completed?: boolean
  /** Secondary data rows (source Type=Multi / Level=Secondary). */
  details?: ProgressKpiRow[]
  /** Optional supporting sentence. */
  detail?: string
  /** BCP 47 locale of the number formatting. @default "it-IT" */
  locale?: string
}

function ProgressKpi({
  label,
  value,
  total = 100,
  channel,
  info,
  completed = false,
  details,
  detail,
  locale = "it-IT",
}: ProgressKpiProps) {
  const t = useMessages("progressKpi")
  const percentage = progressPercentage(value, total)
  return (
    <section
      aria-label={label}
      data-slot="progress-kpi"
      className="pui:grid pui:gap-3 pui:rounded-3xl pui:border pui:bg-background pui:p-6"
    >
      <header data-slot="progress-kpi-header" className="pui:flex pui:items-center pui:gap-2">
        {channel ? (
          <span
            aria-hidden="true"
            data-slot="progress-kpi-channel"
            className="pui:flex pui:shrink-0 pui:items-center pui:justify-center pui:text-choice-icon"
          >
            {channel}
          </span>
        ) : null}
        <span className="pui:min-w-0 pui:flex-1 pui:text-label-sb pui:text-muted-foreground">
          {label}
        </span>
        {info ? (
          <span
            data-slot="progress-kpi-info"
            className="pui:flex pui:shrink-0 pui:items-center pui:justify-center pui:text-primary"
          >
            {info}
          </span>
        ) : null}
      </header>
      <div data-slot="progress-kpi-body" className="pui:grid pui:gap-3">
        <p
          data-slot="progress-kpi-percentage"
          className="pui:text-title-xl-mobile pui:text-foreground"
        >
          {t.valueLabel(percentage)}
        </p>
        <div data-slot="progress-kpi-data" className="pui:grid pui:gap-2">
          <KpiBar percentage={percentage} completed={completed} className="pui:h-4" />
          <KpiFooter value={value} total={total} completed={completed} locale={locale} />
        </div>
        {details?.length ? (
          <div data-slot="progress-kpi-details" className="pui:grid pui:gap-2.5">
            {details.map((row, index) => {
              const rowTotal = row.total ?? 100
              const rowPercentage = Math.min(100, Math.round((row.value / rowTotal) * 100))
              return (
                <div
                  key={`${row.label ?? "row"}-${index}`}
                  data-slot="progress-kpi-row"
                  className="pui:grid pui:gap-2 pui:py-2"
                >
                  {row.label ? (
                    <p className="pui:text-caption-sb pui:text-muted-foreground">{row.label}</p>
                  ) : null}
                  <KpiBar
                    percentage={rowPercentage}
                    completed={row.completed}
                    className="pui:h-2"
                  />
                  <KpiFooter
                    value={row.value}
                    total={rowTotal}
                    completed={row.completed}
                    locale={locale}
                  />
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
      {detail ? <p className="pui:text-label-mini pui:text-muted-foreground">{detail}</p> : null}
    </section>
  )
}

export { ProgressKpi, type ProgressKpiRow }
