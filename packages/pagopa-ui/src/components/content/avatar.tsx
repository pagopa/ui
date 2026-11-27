"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { Icon } from "@/components/icons/icon"
import { Default as AccountBalanceIcon } from "@/components/icons/generated/account-balance"
import { Default as CheckIcon } from "@/components/icons/generated/check"
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
  compact: "pui:size-8",
  small: "pui:size-11",
  medium: "pui:size-12",
  large: "pui:size-16",
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
      className={cn("pui:relative pui:inline-flex pui:shrink-0", avatarSizes[size], className)}
    >
      <AvatarFace
        {...props}
        selectedLabel={selectedLabel}
        size={size}
        compact={Boolean(secondary)}
        className={secondary ? "pui:z-10 pui:origin-top-left pui:scale-[calc(7/11)]" : undefined}
      />
      {secondary ? (
        <AvatarFace
          {...secondary}
          selectedLabel={selectedLabel}
          size={size}
          compact
          overlapped
          className="pui:absolute pui:inset-0 pui:origin-bottom-right pui:scale-[calc(7/11)]"
        />
      ) : null}
      {status ? (
        <>
          <span
            data-slot="avatar-status"
            data-status={status}
            aria-hidden="true"
            className={cn(
              "pui:pointer-events-none pui:absolute pui:right-0 pui:bottom-0 pui:z-20 pui:size-3 pui:border-2 pui:border-background",
              secondary && "pui:right-[calc(100%*4/11)] pui:bottom-[calc(100%*4/11)]",
              status === "online" && "pui:rounded-full pui:bg-success",
              status === "offline" &&
                "pui:rounded-full pui:bg-background pui:after:absolute pui:after:inset-0 pui:after:rounded-full pui:after:border-2 pui:after:border-muted-foreground",
              status === "busy" && "pui:rounded-2 pui:bg-destructive",
            )}
          />
          <span className="pui:sr-only">{statusLabel(status)}</span>
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
    <span className={cn("pui:relative pui:inline-flex", className)}>
      <span
        role="img"
        aria-label={alt}
        aria-busy={loading || undefined}
        className="pui:inline-flex"
      >
        <AvatarPrimitive
          data-avatar-state={loading ? "loading" : selected ? "selected" : undefined}
          className={cn(
            avatarSizes[size],
            size === "compact" && "pui:rounded-[calc(var(--pui-radius)*8/11)]",
            imageFit === "contain" && "pui:bg-card",
            (icon || tone === "inverse") &&
              "pui:[&:has([data-slot=avatar-fallback])]:bg-transparent pui:[&:has([data-slot=avatar-fallback])]:after:border-0",
            selected && "pui:bg-primary pui:text-primary-foreground pui:after:border-0",
            loading && "pui:bg-transparent pui:after:border-0",
          )}
        >
          {loading ? (
            <Skeleton className="pui:col-start-1 pui:row-start-1 pui:size-full pui:rounded-[inherit]" />
          ) : selected ? (
            <Icon source={CheckIcon} size={iconSize} />
          ) : (
            <>
              {src ? (
                <AvatarImage
                  src={src}
                  alt=""
                  className={
                    imageFit === "contain"
                      ? cn(
                          "pui:m-auto pui:rounded-none pui:object-contain",
                          size === "large"
                            ? "pui:size-12"
                            : size === "compact"
                              ? "pui:size-6"
                              : size === "small"
                                ? "pui:size-8"
                                : "pui:size-9",
                        )
                      : undefined
                  }
                />
              ) : null}
              <AvatarFallback
                className={cn(
                  "pui:text-caption-sb",
                  compact && "pui:text-h3",
                  initials && overlapped && !icon && "pui:items-end pui:leading-none",
                  icon || tone === "inverse"
                    ? cn(
                        "pui:bg-avatar-icon-surface",
                        tone === "inverse"
                          ? "pui:text-avatar-inverse-foreground"
                          : "pui:text-foreground",
                      )
                    : initials
                      ? "pui:bg-accent pui:text-primary"
                      : "pui:bg-muted pui:text-avatar-placeholder",
                )}
              >
                {icon ? (
                  <span
                    aria-hidden="true"
                    inert
                    className="pui:flex pui:size-1/2 pui:items-center pui:justify-center pui:[&>*]:max-h-full pui:[&>*]:max-w-full pui:[&>svg:not(.pagopa-icon)]:size-full"
                  >
                    {icon}
                  </span>
                ) : (
                  initials || <Icon source={AccountBalanceIcon} size={iconSize} />
                )}
              </AvatarFallback>
            </>
          )}
        </AvatarPrimitive>
      </span>
      {selected ? <span className="pui:sr-only">{selectedLabel}</span> : null}
    </span>
  )
}

export { Avatar, type AvatarIdentity, type AvatarProps }
