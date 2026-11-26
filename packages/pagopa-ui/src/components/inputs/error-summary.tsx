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
        "pui:rounded-lg pui:border pui:border-error-border pui:bg-error-soft pui:p-4 pui:text-body-sb pui:text-error-foreground",
        className,
      )}
    >
      <p className="pui:text-body-big-sb">{title}</p>
      <ul className="pui:mt-2 pui:flex pui:list-disc pui:flex-col pui:gap-1 pui:pl-5 pui:text-caption">
        {errors.map((error) => (
          <li key={error.fieldId}>
            <a
              href={`#${error.fieldId}`}
              onClick={() => focusFieldTarget(error.fieldId)}
              className="pui:rounded-sm pui:underline pui:underline-offset-4 pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"
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
