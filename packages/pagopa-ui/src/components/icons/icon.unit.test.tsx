import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import type { FigmaIconName } from "pagopa-ui-artwork"

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
