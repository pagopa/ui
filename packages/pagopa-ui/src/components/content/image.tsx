"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { Icon } from "@/components/icons/icon"
import { Default as PhotoIcon } from "@/components/icons/generated/photo"

type ImageProps = React.ComponentProps<"img"> & {
  ratio?: "square" | "video" | "photo" | "portrait" | "cinema" | "wide"
  /** Announced text when the image fails to load. @default messages.image.fallbackLabel */
  fallbackLabel?: string
}

function Image({
  ratio = "video",
  fallbackLabel: fallbackLabelProp,
  className,
  alt,
  ...props
}: ImageProps) {
  const t = useMessages("image")
  const fallbackLabel = fallbackLabelProp ?? t.fallbackLabel

  const [failed, setFailed] = React.useState(false)
  const ratioClass =
    ratio === "square"
      ? "pui:aspect-square"
      : ratio === "photo"
        ? "pui:aspect-[4/3]"
        : ratio === "portrait"
          ? "pui:aspect-[3/4]"
          : ratio === "cinema"
            ? "pui:aspect-[21/9]"
            : ratio === "wide"
              ? "pui:aspect-[3/1]"
              : "pui:aspect-video"

  if (failed || !props.src) {
    return (
      <div
        role="img"
        data-slot="image"
        aria-label={alt || fallbackLabel}
        className={cn(
          "pui:grid pui:place-items-center pui:bg-han-purple-soft pui:text-muted-foreground",
          ratioClass,
          className,
        )}
      >
        <span className="pui:flex pui:items-center pui:gap-2 pui:text-label-mini">
          <Icon source={PhotoIcon} />
          {fallbackLabel}
        </span>
      </div>
    )
  }

  return (
    <img
      alt={alt}
      data-slot="image"
      className={cn("pui:w-full pui:object-cover", ratioClass, className)}
      onError={() => setFailed(true)}
      {...props}
    />
  )
}

export { Image }
export type { ImageProps }
