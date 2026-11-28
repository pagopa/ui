import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test } from "vitest"

import { UIProvider, useLinkComponent, useLocale } from "./ui-provider"

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
  expect(html).toContain('<div class="pagopa-ui-root" data-pagopa-ui=""')
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

function LocaleProbe() {
  const { locale, calendarLocale } = useLocale()
  return React.createElement("span", null, `${locale}/${calendarLocale.code}`)
}

function renderLocale(props: Omit<Parameters<typeof UIProvider>[0], "children">): string {
  return renderToStaticMarkup(
    React.createElement(UIProvider, {
      ...props,
      children: React.createElement(LocaleProbe),
    }),
  )
}

test("keeps the Italian locale and grid of a consumer that configures neither", () => {
  expect(renderLocale({})).toContain("<span>it-IT/it</span>")
})

test("moves the day grid to the English locale when the tree names another language", () => {
  expect(renderLocale({ locale: "en-GB" })).toContain("<span>en-GB/en-US</span>")
})

test("keeps the Italian grid under an Italian code that is not the plain one", () => {
  expect(renderLocale({ locale: "it-CH" })).toContain("<span>it-CH/it</span>")
})

test("lets an explicit calendar locale win over the language of the tree", () => {
  const html = renderLocale({ locale: "en-GB", calendarLocale: { code: "it-IT" } })
  expect(html).toContain("<span>en-GB/it-IT</span>")
})
