"use client"

import { useMessages } from "@/lib/ui-provider"
import { Progress } from "@/components/primitives/progress"

/** Props of {@link ProgressLoader}. */
interface ProgressLoaderProps {
  /**
   * Current progress (0–100, values outside the range are clamped); omit for
   * the indeterminate animation.
   */
  value?: number
  /** Visible label of the bar; also its accessible name. @default messages.progressLoader.label */
  label?: string
  /** Renders the label row above the bar. @default true */
  showLabel?: boolean
  /** Renders the `%` readout in the label row; only meaningful while `showLabel` is true. @default true */
  showValue?: boolean
}

function ProgressLoader({
  value,
  label: labelProp,
  showLabel = true,
  showValue = true,
}: ProgressLoaderProps) {
  const t = useMessages("progressLoader")
  const label = labelProp ?? t.label

  const normalized = value === undefined ? undefined : Math.min(100, Math.max(0, value))
  return (
    <div className={showLabel ? "pui:w-full" : "pui:w-full pui:px-6 pui:py-5"}>
      {showLabel && (
        <div className="pui:mb-2 pui:flex pui:items-center pui:justify-between pui:gap-4 pui:text-label-mini">
          <span className="pui:text-label-mini-sb">{label}</span>
          {showValue && normalized !== undefined && <span>{normalized}%</span>}
        </div>
      )}
      {normalized === undefined ? (
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          data-slot="progress"
          className="pui:relative pui:h-1 pui:w-full pui:overflow-hidden pui:rounded-full"
        >
          <span
            aria-hidden="true"
            data-slot="progress-track-leading"
            className="pui:absolute pui:inset-y-0 pui:left-0 pui:w-2.5 pui:rounded-l-full pui:bg-secondary"
          />
          <span
            aria-hidden="true"
            data-slot="progress-track"
            className="pui:absolute pui:inset-y-0 pui:left-2.5 pui:right-0 pui:rounded-r-full pui:bg-secondary"
          />
          <span
            aria-hidden="true"
            data-slot="progress-indicator"
            className="pui:absolute pui:inset-y-0 pui:left-2.5 pui:w-8 pui:animate-[pulse_1.4s_ease-in-out_infinite] pui:rounded-full pui:bg-primary pui:motion-reduce:animate-none"
          />
        </div>
      ) : (
        <Progress
          value={normalized}
          aria-label={label}
          aria-valuetext={`${normalized}%`}
          className="pui:h-1 pui:rounded-l"
        />
      )}
    </div>
  )
}

export { ProgressLoader, type ProgressLoaderProps }
