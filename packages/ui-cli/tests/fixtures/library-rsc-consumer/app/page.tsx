import { headers } from "next/headers"
import { Button, Tag, UIProvider } from "__PAGOPA_UI_PACKAGE__"

import { Interactions } from "./interactions"

export default async function Page() {
  const request = await headers()

  return (
    <main>
      <h1>Server-rendered service</h1>
      <Tag status="success">Active</Tag>
      <p data-testid="request-marker">{request.get("x-consumer-request") ?? "ordinary request"}</p>
      <UIProvider>
        <Button type="button">Server-imported action</Button>
      </UIProvider>
      <Interactions />
    </main>
  )
}
