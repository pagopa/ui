// The source frame: a story that renders a whole source composition draws it at
// the width the source draws it in — the page column, the drawer panel, the band
// — so the Storybook render and the parity diagnostic are one composition. The
// diagnostic forces the width it measures, so a story without a frame collapses
// for every reader while the comparison still passes.
import { SOURCE_FRAME_ATTRIBUTE, sourceFrameWidth } from "./source-frame-width"

// `layout: "fullscreen"` alone gives the page width, which is the column only
// when the source draws a full-width surface: a container-scoped composition
// passes its device. `maxWidth: 100%` keeps the capture honest on the smaller
// case of the same node — its root is forced to the narrower width, and the
// frame follows it down instead of overflowing.
export function SourceFrame({
  nodeId,
  device,
  className,
  children,
}: {
  nodeId: string
  device?: string
  className?: string
  children: React.ReactNode
}) {
  const width = sourceFrameWidth(nodeId, device)
  return (
    <div
      {...{ [SOURCE_FRAME_ATTRIBUTE]: width }}
      style={{ width, maxWidth: "100%" }}
      className={className}
    >
      {children}
    </div>
  )
}
