"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import {
  Avatar as AvatarPrimitive,
  AvatarFallback,
  AvatarImage,
} from "@/components/primitives/avatar"
import { Skeleton } from "@/components/primitives/skeleton"

/**
 * Identity painted inside one avatar face (the main face or `secondary`).
 */
interface AvatarIdentity {
  /** Accessible name of the identity. */
  alt: string
  /** Image source; wins over `initials` and `icon`. */
  src?: string
  /** Initials shown when there is no image. */
  initials?: string
  /** How the image fills the face. @default "cover" */
  imageFit?: "cover" | "contain"
  /** Decorative glyph when there is no image or initials. */
  icon?: React.ReactNode
  /** Artwork variant for the surrounding surface. @default "default" */
  tone?: "default" | "inverse"
}

/** Props of {@link Avatar}. */
type AvatarProps = AvatarIdentity & {
  /** Selected state; owned by the calling control. @default false */
  selected?: boolean
  /** Loading state; never erases the selection. */
  loading?: boolean
  /** Size step of the component. @default "medium" */
  size?: "compact" | "small" | "medium" | "large"
  /** Optional presence cue. */
  status?: "online" | "offline" | "busy"
  /**
   * Announced presence text, from the status key: the caller owns the phrase.
   * @default messages.avatar.statusLabel
   */
  statusLabel?: (status: "online" | "offline" | "busy") => string
  /** Announced text of the selected state. @default messages.avatar.selectedLabel */
  selectedLabel?: string
  /** Second identity composed with the primary one. */
  secondary?: AvatarIdentity
  /** ClassName applied to the avatar wrapper. */
  className?: string
}

const avatarSizes = {
  compact: "size-8",
  small: "size-11",
  medium: "size-12",
  large: "size-16",
}

function Avatar({
  size = "medium",
  status,
  statusLabel: statusLabelProp,
  selectedLabel: selectedLabelProp,
  secondary,
  className,
  ...props
}: AvatarProps) {
  const t = useMessages("avatar")
  const statusLabel = statusLabelProp ?? t.statusLabel
  const selectedLabel = selectedLabelProp ?? t.selectedLabel

  return (
    <span
      data-slot={secondary ? "avatar-pair" : "avatar-identity"}
      className={cn("relative inline-flex shrink-0", avatarSizes[size], className)}
    >
      <AvatarFace
        {...props}
        selectedLabel={selectedLabel}
        size={size}
        compact={Boolean(secondary)}
        className={secondary ? "z-10 origin-top-left scale-[calc(7/11)]" : undefined}
      />
      {secondary ? (
        <AvatarFace
          {...secondary}
          selectedLabel={selectedLabel}
          size={size}
          compact
          overlapped
          className="absolute inset-0 origin-bottom-right scale-[calc(7/11)]"
        />
      ) : null}
      {status ? (
        <>
          <span
            data-slot="avatar-status"
            data-status={status}
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute right-0 bottom-0 z-20 size-3 border-2 border-background",
              secondary && "right-[calc(100%*4/11)] bottom-[calc(100%*4/11)]",
              status === "online" && "rounded-full bg-success",
              status === "offline" &&
                "rounded-full bg-background after:absolute after:inset-0 after:rounded-full after:border-2 after:border-muted-foreground",
              status === "busy" && "rounded-2 bg-destructive",
            )}
          />
          <span className="sr-only">{statusLabel(status)}</span>
        </>
      ) : null}
    </span>
  )
}

function AvatarFace({
  alt,
  src,
  initials,
  imageFit = "cover",
  icon,
  tone = "default",
  selected = false,
  selectedLabel: selectedLabelProp,
  loading = false,
  compact = false,
  overlapped = false,
  size = "medium",
  className,
}: Omit<AvatarProps, "status" | "secondary" | "statusLabel"> & {
  compact?: boolean
  overlapped?: boolean
}) {
  const t = useMessages("avatar")
  const selectedLabel = selectedLabelProp ?? t.selectedLabel

  const iconSize = size === "large" ? 32 : size === "compact" ? 16 : 24
  return (
    <span className={cn("relative inline-flex", className)}>
      <span role="img" aria-label={alt} aria-busy={loading || undefined} className="inline-flex">
        <AvatarPrimitive
          data-avatar-state={loading ? "loading" : selected ? "selected" : undefined}
          className={cn(
            avatarSizes[size],
            size === "compact" && "rounded-[calc(var(--radius)*8/11)]",
            imageFit === "contain" && "bg-card",
            (icon || tone === "inverse") &&
              "[&:has([data-slot=avatar-fallback])]:bg-transparent [&:has([data-slot=avatar-fallback])]:after:border-0",
            selected && "bg-primary text-primary-foreground after:border-0",
            loading && "bg-transparent after:border-0",
          )}
        >
          {loading ? (
            <Skeleton className="col-start-1 row-start-1 size-full rounded-[inherit]" />
          ) : selected ? (
            <PagoPAIcon name="check" size={iconSize} />
          ) : (
            <>
              {src ? (
                <AvatarImage
                  src={src}
                  alt=""
                  className={
                    imageFit === "contain"
                      ? cn(
                          "m-auto rounded-none object-contain",
                          size === "large"
                            ? "size-12"
                            : size === "compact"
                              ? "size-6"
                              : size === "small"
                                ? "size-8"
                                : "size-9",
                        )
                      : undefined
                  }
                />
              ) : null}
              <AvatarFallback
                className={cn(
                  "text-caption-sb",
                  compact && "text-h3",
                  initials && overlapped && !icon && "items-end leading-none",
                  icon || tone === "inverse"
                    ? cn(
                        "bg-avatar-icon-surface",
                        tone === "inverse" ? "text-avatar-inverse-foreground" : "text-foreground",
                      )
                    : initials
                      ? "bg-accent text-primary"
                      : "bg-muted text-avatar-placeholder",
                )}
              >
                {icon ? (
                  <span
                    aria-hidden="true"
                    inert
                    className="flex size-1/2 items-center justify-center [&>*]:max-h-full [&>*]:max-w-full [&>svg]:size-full"
                  >
                    {icon}
                  </span>
                ) : (
                  initials || <PagoPAIcon name="account_balance" size={iconSize} />
                )}
              </AvatarFallback>
            </>
          )}
        </AvatarPrimitive>
      </span>
      {selected ? <span className="sr-only">{selectedLabel}</span> : null}
    </span>
  )
}

export { Avatar, type AvatarIdentity, type AvatarProps }
