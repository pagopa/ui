"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar"
import { cn } from "@/lib/cn"

function Avatar({
  className,
  size = "default",
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: "default" | "sm" | "lg"
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        "group/avatar pui:relative pui:grid pui:size-8 pui:shrink-0 pui:place-items-center pui:rounded-lg pui:select-none pui:after:pointer-events-none pui:after:absolute pui:after:inset-0 pui:after:rounded-[inherit] pui:after:border pui:after:border-avatar-frame pui:data-[size=lg]:size-10 pui:data-[size=sm]:size-6",
        className,
      )}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn(
        "pui:col-start-1 pui:row-start-1 pui:aspect-square pui:size-full pui:rounded-[inherit] pui:object-cover",
        className,
      )}
      {...props}
    />
  )
}

function AvatarFallback({ className, ...props }: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "pui:col-start-1 pui:row-start-1 pui:flex pui:size-full pui:items-center pui:justify-center pui:rounded-[inherit] pui:bg-muted pui:text-label-mini pui:text-muted-foreground pui:group-data-[size=sm]/avatar:text-caption",
        className,
      )}
      {...props}
    />
  )
}

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "pui:absolute pui:right-0 pui:bottom-0 pui:z-10 pui:inline-flex pui:items-center pui:justify-center pui:rounded-full pui:bg-primary pui:text-primary-foreground pui:bg-blend-color pui:ring-2 pui:ring-background pui:select-none",
        "pui:group-data-[size=sm]/avatar:size-2 pui:group-data-[size=sm]/avatar:[&>svg]:hidden",
        "pui:group-data-[size=default]/avatar:size-2.5 pui:group-data-[size=default]/avatar:[&>svg:not(.pagopa-icon)]:size-2",
        "pui:group-data-[size=lg]/avatar:size-3 pui:group-data-[size=lg]/avatar:[&>svg:not(.pagopa-icon)]:size-2",
        className,
      )}
      {...props}
    />
  )
}

function AvatarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group pui:flex pui:-space-x-2 pui:*:data-[slot=avatar]:ring-2 pui:*:data-[slot=avatar]:ring-background",
        className,
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "pui:relative pui:flex pui:size-8 pui:shrink-0 pui:items-center pui:justify-center pui:rounded-full pui:bg-muted pui:text-label-mini pui:text-muted-foreground pui:ring-2 pui:ring-background pui:group-has-data-[size=lg]/avatar-group:size-10 pui:group-has-data-[size=sm]/avatar-group:size-6 pui:[&>svg:not(.pagopa-icon)]:size-4 pui:group-has-data-[size=lg]/avatar-group:[&>svg:not(.pagopa-icon)]:size-5 pui:group-has-data-[size=sm]/avatar-group:[&>svg:not(.pagopa-icon)]:size-3",
        className,
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarBadge }
