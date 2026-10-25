// The root layout is a Server Component: it imports the published stylesheet
// once, and the page below it stays server-rendered where it can.
import type { ReactNode } from "react"

import "__PAGOPA_UI_PACKAGE__/styles.css"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}
