import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import type { FigmaIconName } from "pagopa-ui-artwork"

import * as add from "./generated/add"
import * as mailError from "./generated/mail-error"
import { Icon } from "./icon"
import { PagoPAIcon } from "./PagoPAIcon"

function Glyph(props: React.SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" {...props} />
}

const markup = (element: React.ReactElement) => renderToStaticMarkup(element)

describe("Icon sizing", () => {
  it("paints `size` in the presentation attributes, never an inline style", () => {
    const html = markup(<Icon source={Glyph} size={16} />)
    expect(html).toContain('width="16"')
    expect(html).toContain('height="16"')
    expect(html).not.toContain("style=")
  })

  it("lets className size the glyph past the default box", () => {
    const html = markup(<Icon source={Glyph} className="pui:size-3.5" />)
    expect(html).toContain("pui:size-3.5")
    // A class beats a presentation attribute, so no inline style may pin 24px.
    expect(html).not.toContain("style=")
  })

  it("hands the caller style through as written", () => {
    const html = markup(<Icon source={Glyph} style={{ pointerEvents: "none" }} />)
    expect(html).toContain("pointer-events:none")
    expect(html).not.toContain("width:24px")
  })
})

describe("PagoPAIcon host contract", () => {
  const name: FigmaIconName = "check"

  it("forwards style and svg attributes to the rendered glyph", () => {
    const html = markup(
      <PagoPAIcon
        name={name}
        data-testid="glyph"
        style={{ pointerEvents: "none" }}
        className="probe"
      />,
    )
    expect(html).toContain('data-testid="glyph"')
    expect(html).toContain("pointer-events:none")
    expect(html).toContain("probe")
  })
})

describe("PagoPAIcon unknown input", () => {
  const withWarning = (render: () => string) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const html = render()
    // `mockRestore` drops the recorded calls, so read them before restoring.
    const messages = warn.mock.calls.map(([message]) => String(message))
    warn.mockRestore()
    return { html, messages }
  }

  it("renders nothing and warns when the name misses the catalogue", () => {
    const { html, messages } = withWarning(() =>
      markup(
        // A name built at runtime reaches the component as a plain string.
        // @ts-expect-error — the public union cannot express it.
        <PagoPAIcon name="not-a-published-icon" />,
      ),
    )
    expect(html).toBe("")
    expect(messages.some((message) => message.includes("not-a-published-icon"))).toBe(true)
  })

  it("throws when the variant is not published, as the packed check pins", () => {
    expect(() =>
      markup(
        // @ts-expect-error — the public union cannot express a runtime variant.
        <PagoPAIcon name="check" variant="missing" />,
      ),
    ).toThrow(/has no source asset for variant "missing"/)
  })
})

describe("Generated artwork", () => {
  it("keeps a glyph's definition ids inside its own instance", () => {
    const html = markup(
      <>
        <mailError.Default />
        <mailError.Default />
      </>,
    )
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(([, id]) => id)
    // `mail_error` is the one glyph whose artwork keeps a clip path, so it is
    // the only one that can collide at all.
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
    const references = [...html.matchAll(/clip-path="url\(#([^)]+)\)"/g)].map(([, id]) => id)
    // Each instance points at its own definition, in order.
    expect(references).toEqual(ids)
  })

  it("ships no mask, and no identity wrapper around the paint", () => {
    for (const Variant of Object.values(add.variants)) {
      const html = markup(<Variant />)
      expect(html).not.toContain("<mask")
      expect(html).not.toContain("matrix(1 0 0 1 0 0)")
      // No definition at all, so nothing to namespace (`data-figma-node-id` is
      // attributed, not a DOM id).
      expect(html).not.toMatch(/ id="/)
    }
  })
})
