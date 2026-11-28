import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { UIProvider, useLinkComponent } from "./ui-provider"

function Probe() {
  const Link = useLinkComponent()
  return React.createElement(Link, { href: "/dicitura" }, "Dicitura")
}

test("renders a plain anchor when no provider configures a link component", () => {
  expect(renderToStaticMarkup(React.createElement(Probe))).toBe('<a href="/dicitura">Dicitura</a>')
})

test("keeps the root class alone when the provider is given no theme scope", () => {
  const html = renderToStaticMarkup(
    React.createElement(UIProvider, { children: React.createElement("span", null, "Contenuto") }),
  )
  expect(html).toContain('<div class="pagopa-ui-root" data-slot="ui-provider"')
  expect(html).not.toContain("style=")
})

test("adds the className and the style it is given to the root the tokens publish on", () => {
  const html = renderToStaticMarkup(
    React.createElement(UIProvider, {
      className: "brand-theme",
      style: { "--pui-primary": "#123456", color: "red" },
      children: React.createElement("span", null, "Contenuto"),
    }),
  )
  expect(html).toContain('class="pagopa-ui-root brand-theme"')
  expect(html).toContain("--pui-primary:#123456")
  expect(html).toContain("color:red")
})
