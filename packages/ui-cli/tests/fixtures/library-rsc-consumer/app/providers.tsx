"use client"

import * as React from "react"
import Link from "next/link"
import { UIProvider, enMessages, type LinkComponentProps } from "__PAGOPA_UI_PACKAGE__"

export const NextLinkAdapter = React.forwardRef<HTMLAnchorElement, LinkComponentProps>(
  function NextLinkAdapter({ href, ...props }, ref) {
    return <Link {...props} href={href} ref={ref} data-next-adapter="true" />
  },
)

const messages = {
  ...enMessages,
  pagination: {
    ...enMessages.pagination,
    previousLabel: "Earlier results",
    pageLabel: (page: number) => `Result page ${page}`,
  },
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider linkComponent={NextLinkAdapter} locale="en-US" messages={messages}>
      {children}
    </UIProvider>
  )
}
