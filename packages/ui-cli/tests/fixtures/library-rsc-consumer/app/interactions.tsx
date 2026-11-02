"use client"

import * as React from "react"
import { Breadcrumb, Button, Dialog, Pagination, Popover, TextField } from "__PAGOPA_UI_PACKAGE__"

import { NextLinkAdapter } from "./providers"

export function Interactions() {
  const [page, setPage] = React.useState(2)
  const [submitted, setSubmitted] = React.useState("")
  const [adapterTarget, setAdapterTarget] = React.useState<HTMLAnchorElement | null>(null)

  return (
    <>
      <Breadcrumb items={[{ label: "Receipts", href: "/receipts" }, { label: "Payment" }]} />
      <NextLinkAdapter
        href="/receipts"
        ref={setAdapterTarget}
        aria-label="Router reference probe"
        className="consumer-router-probe"
        data-consumer-prop="forwarded"
      >
        Reference probe
      </NextLinkAdapter>
      <output data-testid="adapter-reference">
        {adapterTarget?.tagName === "A" && adapterTarget.getAttribute("href") === "/receipts"
          ? "connected"
          : "waiting"}
      </output>
      <Pagination currentPage={page} totalPages={3} onPageChange={setPage} />
      <form
        aria-label="Payment reference"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(String(new FormData(event.currentTarget).get("reference")))
        }}
      >
        <TextField label="Reference" name="reference" required />
        <Button type="submit">Submit reference</Button>
      </form>
      <output aria-label="Submitted reference">{submitted}</output>
      <Dialog trigger={<Button type="button">Open payment details</Button>} title="Payment details">
        <p>Details from the installed package</p>
      </Dialog>
      {/* Open on first render: the overlay must mount into the library portal
          root from hydration, without waiting for a click. */}
      <Popover
        defaultOpen
        trigger={<Button type="button">Open delivery notes</Button>}
        label="Delivery notes"
      >
        Notes from the installed package
      </Popover>
    </>
  )
}
