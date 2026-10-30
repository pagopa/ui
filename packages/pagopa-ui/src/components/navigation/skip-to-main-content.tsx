"use client"

import * as React from "react"

import { useMessages } from "@/lib/ui-provider"

function SkipToMainContent({
  targetId = "main-content",
  children: childrenProp,
}: {
  targetId?: string
  /** Link text of the skip control. @default messages.skipToMainContent.children */
  children?: React.ReactNode
}) {
  const t = useMessages("skipToMainContent")
  const children = childrenProp ?? t.children

  return (
    <a
      href={`#${targetId}`}
      className="fixed top-0 left-1/2 z-[100] inline-flex w-max -translate-x-1/2 -translate-y-full rounded-xl border-2 border-skip-to-main-ring px-0.5 py-0.5 transition-transform focus:translate-y-0 motion-reduce:transition-none"
    >
      <span className="inline-flex h-12 items-center justify-center rounded-lg bg-foreground px-4 text-body-sb whitespace-nowrap text-inverse-foreground underline">
        {children}
      </span>
    </a>
  )
}

export { SkipToMainContent }
