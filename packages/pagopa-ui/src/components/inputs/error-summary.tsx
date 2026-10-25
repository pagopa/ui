"use client"

import * as React from "react"

import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

/**
 * One entry of the error summary: the message the caller already renders next
 * to the control, linked back to its id.
 */
interface ErrorSummaryItem {
  /** Id of the control the message belongs to. */
  fieldId: string
  /** Complete message for that control, owned by the caller. */
  message: React.ReactNode
}

// A fragment link only lands the focus on a naturally focusable target: a
// composite target that groups controls (a radio group, the frame of an OTP)
// gets a tabindex so the navigation genuinely reaches it. No `preventDefault`:
// the fragment scroll stays native.
const FOCUSABLE = "a[href], button, input:not([type='hidden']), select, textarea, [tabindex]"
function focusFieldTarget(fieldId: string) {
  const target = document.getElementById(fieldId)
  if (target && !target.matches(FOCUSABLE)) target.tabIndex = -1
}

// A form reports its errors through one announcement strategy: the summary
// announces once (`role="alert"`), links each control, and the controls stay
// associated with their own message through `aria-describedby`. Per-message
// live regions would announce the same failure several times.
function ErrorSummary({
  errors,
  title: titleProp,
  className,
}: {
  /** Errors to list: every message links back to its control. */
  errors: ErrorSummaryItem[]
  /**
   * Summary title. The caller owns the copy, including any count.
   * @default messages.errorSummary.title
   */
  title?: React.ReactNode
  /** ClassName applied to the summary box. */
  className?: string
}) {
  const t = useMessages("errorSummary")
  const title = titleProp ?? t.title

  if (!errors.length) return null
  return (
    <div
      role="alert"
      data-slot="error-summary"
      className={cn(
        "rounded-lg border border-error-border bg-error-soft p-4 text-body-sb text-error-foreground",
        className,
      )}
    >
      <p className="text-body-big-sb">{title}</p>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-caption">
        {errors.map((error) => (
          <li key={error.fieldId}>
            <a
              href={`#${error.fieldId}`}
              onClick={() => focusFieldTarget(error.fieldId)}
              className="rounded-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {error.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export { ErrorSummary, type ErrorSummaryItem }
