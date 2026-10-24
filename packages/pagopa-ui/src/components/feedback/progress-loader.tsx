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
    <div className={showLabel ? "w-full" : "w-full px-6 py-5"}>
      {showLabel && (
        <div className="mb-2 flex items-center justify-between gap-4 text-label-mini">
          <span className="text-label-mini-sb">{label}</span>
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
          className="relative h-1 w-full overflow-hidden rounded-full"
        >
          <span
            aria-hidden="true"
            data-slot="progress-track-leading"
            className="absolute inset-y-0 left-0 w-2.5 rounded-l-full bg-secondary"
          />
          <span
            aria-hidden="true"
            data-slot="progress-track"
            className="absolute inset-y-0 left-2.5 right-0 rounded-r-full bg-secondary"
          />
          <span
            aria-hidden="true"
            data-slot="progress-indicator"
            className="absolute inset-y-0 left-2.5 w-8 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-primary motion-reduce:animate-none"
          />
        </div>
      ) : (
        <Progress
          value={normalized}
          aria-label={label}
          aria-valuetext={`${normalized}%`}
          className="h-1 rounded-l"
        />
      )}
    </div>
  )
}

export { ProgressLoader, type ProgressLoaderProps }
