import * as React from "react"
import { cn } from "@/lib/cn"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

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
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
      aria-label={`${percentage}%`}
      className={cn("w-full overflow-hidden rounded-2xl bg-secondary", className)}
    >
      <div
        className={cn("h-full rounded-2xl", completed ? "bg-success" : "bg-primary")}
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
    <div data-slot="progress-kpi-footer" className="flex items-center gap-0.5">
      <span className="text-body-sb text-foreground">{value.toLocaleString(locale)}</span>
      <span className="text-label-mini text-foreground">/ {total.toLocaleString(locale)}</span>
      {completed ? <PagoPAIcon name="check_circle" size={16} className="text-success" /> : null}
    </div>
  )
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
}: {
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
}) {
  const percentage = Math.min(100, Math.round((value / total) * 100))
  return (
    <section
      aria-label={label}
      data-slot="progress-kpi"
      className="grid gap-3 rounded-3xl border bg-background p-6"
    >
      <header data-slot="progress-kpi-header" className="flex items-center gap-2">
        {channel ? (
          <span
            aria-hidden="true"
            data-slot="progress-kpi-channel"
            className="flex shrink-0 items-center justify-center text-choice-icon"
          >
            {channel}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 text-label-sb text-muted-foreground">{label}</span>
        {info ? (
          <span
            data-slot="progress-kpi-info"
            className="flex shrink-0 items-center justify-center text-primary"
          >
            {info}
          </span>
        ) : null}
      </header>
      <div data-slot="progress-kpi-body" className="grid gap-3">
        <p data-slot="progress-kpi-percentage" className="text-title-xl-mobile text-foreground">
          {percentage}%
        </p>
        <div data-slot="progress-kpi-data" className="grid gap-2">
          <KpiBar percentage={percentage} completed={completed} className="h-4" />
          <KpiFooter value={value} total={total} completed={completed} locale={locale} />
        </div>
        {details?.length ? (
          <div data-slot="progress-kpi-details" className="grid gap-2.5">
            {details.map((row, index) => {
              const rowTotal = row.total ?? 100
              const rowPercentage = Math.min(100, Math.round((row.value / rowTotal) * 100))
              return (
                <div
                  key={`${row.label ?? "row"}-${index}`}
                  data-slot="progress-kpi-row"
                  className="grid gap-2 py-2"
                >
                  {row.label ? (
                    <p className="text-caption-sb text-muted-foreground">{row.label}</p>
                  ) : null}
                  <KpiBar percentage={rowPercentage} completed={row.completed} className="h-2" />
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
      {detail ? <p className="text-label-mini text-muted-foreground">{detail}</p> : null}
    </section>
  )
}

export { ProgressKpi, type ProgressKpiRow }
