import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { useLinkComponent } from "./ui-provider"

function Probe() {
  const Link = useLinkComponent()
  return React.createElement(Link, { href: "/dicitura" }, "Dicitura")
}

test("renders a plain anchor when no provider configures a link component", () => {
  expect(renderToStaticMarkup(React.createElement(Probe))).toBe('<a href="/dicitura">Dicitura</a>')
})
