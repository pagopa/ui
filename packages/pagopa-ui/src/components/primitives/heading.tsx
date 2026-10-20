import * as React from "react"

/** Heading tags a component title may render as. */
type HeadingTag = "h2" | "h3" | "h4" | "h5" | "h6"

// The design system titles default to a level-2 heading (the page section
// reads as a direct child of its h1); the caller owning a different outline
// passes its own tag, like SectionHeader's `titleAs`.
function Heading({
  as: Tag = "h2",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { as?: HeadingTag }) {
  return React.createElement(Tag, props)
}

export { Heading, type HeadingTag }
