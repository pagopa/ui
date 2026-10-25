"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { ImageIcon } from "@/components/primitives/icons"

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
      ? "aspect-square"
      : ratio === "photo"
        ? "aspect-[4/3]"
        : ratio === "portrait"
          ? "aspect-[3/4]"
          : ratio === "cinema"
            ? "aspect-[21/9]"
            : ratio === "wide"
              ? "aspect-[3/1]"
              : "aspect-video"

  if (failed || !props.src) {
    return (
      <div
        role="img"
        data-slot="image"
        aria-label={alt || fallbackLabel}
        className={cn(
          "grid place-items-center bg-han-purple-soft text-muted-foreground",
          ratioClass,
          className,
        )}
      >
        <span className="flex items-center gap-2 text-label-mini">
          <ImageIcon aria-hidden="true" />
          {fallbackLabel}
        </span>
      </div>
    )
  }

  return (
    <img
      alt={alt}
      data-slot="image"
      className={cn("w-full object-cover", ratioClass, className)}
      onError={() => setFailed(true)}
      {...props}
    />
  )
}

export { Image }
