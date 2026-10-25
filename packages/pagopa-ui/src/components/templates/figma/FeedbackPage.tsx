import * as React from "react"

import { cn } from "@/lib/cn"

export interface FeedbackPageProps {
  /** Application chrome above the content. */
  preheader?: React.ReactNode
  /** Application chrome below the preheader. */
  header?: React.ReactNode
  /** The state block: `OKState`, `KOState` or `WaitingState`. */
  children: React.ReactNode
  /** Application chrome below the content. */
  footer?: React.ReactNode
  className?: string
}

// Source set `1904:9589` ("Feedback Page"), fifteen device frames (320/600/900/
// 1200/1536 × three messages, 774–1127 tall). Every variant is the application
// chrome around one state block: the preheader (55px band + divider), the header
// (103px) with the product and profile rows, the state — the source instances
// are the OK, KO and Waiting states the library already implements — and the
// footer (182px: the compact link band plus the company sentence). The page is
// content-driven: 55 + 103 + 466 + 182 = the 806px desktop frame.
function FeedbackPage({ preheader, header, children, footer, className }: FeedbackPageProps) {
  return (
    <div
      data-slot="feedback-page"
      className={cn("flex min-h-(--artboard-height-tall) flex-col bg-background", className)}
    >
      {preheader}
      {header}
      <main className="flex-1">{children}</main>
      {footer}
    </div>
  )
}

export { FeedbackPage }
