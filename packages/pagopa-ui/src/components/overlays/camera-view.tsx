"use client"

import * as React from "react"

import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"
import { Icon } from "@/components/icons/icon"
import { Default as PhotoIcon } from "@/components/icons/generated/photo"

// Source "CameraViewElement" (1134:6812): a 376×378 Color/Surface/Surface
// overlay scrim at radius 16, four 44px corner brackets (4px stroke, 24px
// elbow) and a centred 4px guide line. The brackets sit 80px inside the
// frame's edges, which the percentage inset reproduces at any width.
/** Props of the camera framing overlay. */
export interface CameraViewProps extends Omit<React.ComponentProps<"figure">, "children"> {
  /** Announced instruction of the frame. @default messages.cameraView.label */
  label?: string
  /**
   * Complete announced caption, from the label and the camera state: the
   * caller owns the sentence. @default messages.cameraView.announcement
   */
  announcement?: (state: { label: string; active: boolean }) => string
  children?: React.ReactNode
  active?: boolean
}

/**
 * Camera framing overlay: decorative crop brackets around a square preview and
 * the active/inactive state announced with spoken text.
 *
 * Figma: CameraViewElement (node 1134:6812)
 */
function CameraView({
  label: labelProp,
  announcement: announcementProp,
  children,
  active = true,
  className,
  ref,
  ...props
}: CameraViewProps) {
  const t = useMessages("cameraView")
  const label = labelProp ?? t.label
  const announcement = announcementProp ?? t.announcement

  return (
    <figure
      ref={ref}
      data-slot="camera-view"
      className={cn(
        "pui:relative pui:aspect-square pui:w-(--pui-camera-size) pui:max-w-full pui:overflow-hidden pui:rounded-2xl pui:bg-overlay pui:text-inverse-foreground",
        className,
      )}
      {...props}
    >
      <div className="pui:absolute pui:inset-0 pui:grid pui:place-items-center">
        {children === undefined ? (
          <Icon source={PhotoIcon} className="pui:size-16 pui:opacity-40" />
        ) : (
          children
        )}
      </div>
      <span
        aria-hidden="true"
        data-slot="camera-crop"
        className="pui:pointer-events-none pui:absolute pui:inset-[21.3%]"
      >
        <span className="pui:absolute pui:top-0 pui:left-0 pui:size-11 pui:rounded-tl-3xl pui:border-t-4 pui:border-l-4 pui:border-inverse-foreground" />
        <span className="pui:absolute pui:top-0 pui:right-0 pui:size-11 pui:rounded-tr-3xl pui:border-t-4 pui:border-r-4 pui:border-inverse-foreground" />
        <span className="pui:absolute pui:bottom-0 pui:left-0 pui:size-11 pui:rounded-bl-3xl pui:border-b-4 pui:border-l-4 pui:border-inverse-foreground" />
        <span className="pui:absolute pui:right-0 pui:bottom-0 pui:size-11 pui:rounded-br-3xl pui:border-r-4 pui:border-b-4 pui:border-inverse-foreground" />
        {/* Source `Line 55` is 208px wide at x=84 of 376: 4px inside the 21.3% inset. */}
        <span className="pui:absolute pui:top-1/2 pui:right-1 pui:left-1 pui:h-1 pui:-translate-y-1/2 pui:rounded-full pui:bg-inverse-foreground" />
      </span>
      {/* The source frame paints no copy: the 35% scrim is not a legible
          surface for white text, so the instruction stays announced only. */}
      <figcaption className="pui:sr-only">{announcement({ label, active })}</figcaption>
    </figure>
  )
}

export { CameraView }
