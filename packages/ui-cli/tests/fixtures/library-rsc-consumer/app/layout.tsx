import type { ReactNode } from "react"

import "__PAGOPA_UI_PACKAGE__/styles.css"
import { Providers } from "./providers"

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
