import * as React from "react"

import { Camera } from "@/components/primitives/icons"

// Source "CameraViewElement" (1134:6812): a 376×378 Color/Surface/Surface
// overlay scrim at radius 16, four 44px corner brackets (4px stroke, 24px
// elbow) and a centred 4px guide line. The brackets sit 80px inside the
// frame's edges, which the percentage inset reproduces at any width.
function CameraViewElement({
  label = "Inquadra il codice",
  announcement = ({ label: name, active: isActive }) =>
    `${name}. ${isActive ? "Fotocamera attiva" : "Fotocamera non attiva"}`,
  children,
  active = true,
}: {
  label?: string
  /**
   * Complete announced caption, from the label and the camera state: the
   * caller owns the sentence. @default built-in Italian caption
   */
  announcement?: (state: { label: string; active: boolean }) => string
  children?: React.ReactNode
  active?: boolean
}) {
  return (
    <figure className="relative aspect-square w-(--camera-size) max-w-full overflow-hidden rounded-2xl bg-overlay text-inverse-foreground">
      <div className="absolute inset-0 grid place-items-center">
        {children || <Camera aria-hidden="true" className="size-16 opacity-40" />}
      </div>
      <span aria-hidden="true" className="pointer-events-none absolute inset-[21.3%]">
        <span className="absolute top-0 left-0 size-11 rounded-tl-3xl border-t-4 border-l-4 border-inverse-foreground" />
        <span className="absolute top-0 right-0 size-11 rounded-tr-3xl border-t-4 border-r-4 border-inverse-foreground" />
        <span className="absolute bottom-0 left-0 size-11 rounded-bl-3xl border-b-4 border-l-4 border-inverse-foreground" />
        <span className="absolute right-0 bottom-0 size-11 rounded-br-3xl border-r-4 border-b-4 border-inverse-foreground" />
        {/* Source `Line 55` is 208px wide at x=84 of 376: 4px inside the 21.3% inset. */}
        <span className="absolute top-1/2 right-1 left-1 h-1 -translate-y-1/2 rounded-full bg-inverse-foreground" />
      </span>
      {/* The source frame paints no copy: the 35% scrim is not a legible
          surface for white text, so the instruction stays announced only. */}
      <figcaption className="sr-only">{announcement({ label, active })}</figcaption>
    </figure>
  )
}

export { CameraViewElement }
