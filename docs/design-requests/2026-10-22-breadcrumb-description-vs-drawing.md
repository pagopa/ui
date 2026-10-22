# Does the Breadcrumb description or its drawing define the current page, the depth and the Back layout?

- Node: [Breadcrumbs](https://www.figma.com/design/pvhsJpPGQbEwNLiyP7BOIw?node-id=123-7768) (`123:7768`)
- Page: • Breadcrumb 🟠
- Status: open — the questions do not block the render; the node is
  `implemented` against the drawn variants and the answers may change it later
- Decision owner: Figma design owner

## Context

`Breadcrumb` shows the navigation path of a page. The set has two layouts:
`Layout=Extended` (`123:7769`), the path of links separated by a chevron and
ending with the current page, and `Layout=Compact` (`123:7777`), a single
"Back" link with an arrow. The library renders both exactly as drawn: 22px and
24px rows, the 6px path gap, the 16px chevron, the 24px arrow and the hover
states of the private `.Breadcrumbs single element` (`124:3575`).

The set description, written for developers, says three things the drawing
does not show in the same way.

## The open question

- **Current page style.** The description says the current page uses
  `text.primary` and its sample code sets `fontWeight='bold'`. The drawn
  variant `Current` (`10789:15207`) uses Titillio Regular in #555c70
  (`color/text/description`). Which one is intended?
- **Maximum depth.** The description names the toggles "Show Level 3–6", but
  the published properties are "Show Level 2–5": at most five ancestors plus
  the current page. Is there a maximum depth, and should a longer path
  collapse (for example into an ellipsis) instead of wrapping?
- **Back on mobile.** The description says the Back layout points at the
  second-to-last item of the path and is meant for mobile breakpoints. The set
  declares no Device axis, so today the consumer chooses Extended or Compact
  and passes an explicit Back destination. Should the component switch to
  Back automatically on small screens and derive its destination from the
  path?

## Why it matters

Nothing is blocked today: the component follows the drawing, which is what the
parity cases compare. If the description is the intended behaviour, the
library has to change: the current page would turn bold and darker, a path
longer than five ancestors would collapse, and the Compact layout would become
an automatic responsive mode instead of an explicit choice. Guessing any of
these would change the public API of a component already in use (the login
page renders the Compact layout). Once the answer arrives, the node is reviewed
again and the description or the drawing is aligned in Figma.

## Options

- **Keep the drawing** (current state): regular #555c70 current page, which
  passes AA contrast (about 6.7:1); any number of ancestors, wrapping on narrow
  screens; Back chosen by the consumer with an explicit destination. The
  description is updated to match.
- **Follow the description**: a bold `text.primary` current page; a maximum of
  five ancestors (or a collapse rule to define); an automatic switch to Back
  under a breakpoint to define, pointing at the second-to-last item. The
  drawing gains the matching variants or a Device axis.
- **Mix**: confirm the drawn style and the explicit Back, and only define a
  maximum depth or a collapse rule.

## What is already fixed

- The anatomy, type (16/22 Semibold links), colours (#0e0f13 links, #0b3ee3
  hover with underline), the 6px gap, the 16px chevron and the 24px arrow with
  its 4px gap.
- The 22px and 24px row heights; the 44px pointer target of each link is an
  invisible expansion that does not change the drawn size.
- The current page is plain text announced as the current page, never a link.
