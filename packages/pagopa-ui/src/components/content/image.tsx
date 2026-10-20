import * as React from "react"
import { cn } from "@/lib/cn"

import { ImageIcon } from "@/components/primitives/icons"

type ImageProps = React.ComponentProps<"img"> & {
  ratio?: "square" | "video" | "photo" | "portrait" | "cinema" | "wide"
  fallbackLabel?: string
}

function Image({
  ratio = "video",
  fallbackLabel = "Immagine non disponibile",
  className,
  alt,
  ...props
}: ImageProps) {
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
      className={cn("w-full object-cover", ratioClass, className)}
      onError={() => setFailed(true)}
      {...props}
    />
  )
}

export { Image }
