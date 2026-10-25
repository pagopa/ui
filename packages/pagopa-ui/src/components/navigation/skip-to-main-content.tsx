import * as React from "react"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

function SkipToMainContent({
  targetId = "main-content",
  children = "Vai al contenuto principale",
}: {
  targetId?: string
  children?: React.ReactNode
}) {
  return (
    <a
      href={`#${targetId}`}
      className="fixed inset-x-0 top-0 z-[100] inline-flex min-h-10 -translate-y-full items-center gap-2 bg-background px-6 py-2 text-body-sb text-primary underline transition-transform focus:translate-y-0 focus:outline-2 focus:-outline-offset-2 focus:outline-ring motion-reduce:transition-none"
    >
      {children}
      <PagoPAIcon name="arrow" className="shrink-0" />
    </a>
  )
}

export { SkipToMainContent }
