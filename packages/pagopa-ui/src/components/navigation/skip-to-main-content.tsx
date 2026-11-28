"use client"

import * as React from "react"

import { useMessages } from "@/lib/ui-provider"

export interface SkipToMainContentProps {
  targetId?: string
  /** Link text of the skip control. @default messages.skipToMainContent.children */
  children?: React.ReactNode
}

function SkipToMainContent({
  targetId = "main-content",
  children: childrenProp,
}: SkipToMainContentProps) {
  const t = useMessages("skipToMainContent")
  const children = childrenProp ?? t.children

  return (
    <a
      data-slot="skip-to-main-content"
      href={`#${targetId}`}
      className="pui:fixed pui:top-0 pui:left-1/2 pui:z-[100] pui:inline-flex pui:w-max pui:-translate-x-1/2 pui:-translate-y-full pui:rounded-xl pui:border-2 pui:border-skip-to-main-ring pui:px-0.5 pui:py-0.5 pui:transition-transform pui:focus:translate-y-0 pui:motion-reduce:transition-none"
    >
      <span className="pui:inline-flex pui:h-12 pui:items-center pui:justify-center pui:rounded-lg pui:bg-foreground pui:px-4 pui:text-body-sb pui:whitespace-nowrap pui:text-inverse-foreground pui:underline">
        {children}
      </span>
    </a>
  )
}

export { SkipToMainContent }
