"use client"

import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cn } from "@/lib/cn"

import type { ElementProps } from "./props"

export type CardProps = React.ComponentProps<"div"> & {
  /** Compact step of the card. @default "default" */
  size?: "default" | "sm"
  /**
   * Composition: `product` and `product-image` are the ProductCard shells;
   * `default` is the plain card.
   * @default "default"
   */
  variant?: "default" | "product" | "product-image"
}

/** Props of the card header slot. */
export type CardHeaderProps = React.ComponentProps<"div">
/** Props of the card title. */
export type CardTitleProps = ElementProps<"div">
/** Props of the card description. */
export type CardDescriptionProps = React.ComponentProps<"div">
/** Props of the card action slot. */
export type CardActionProps = React.ComponentProps<"div">
/** Props of the card content slot. */
export type CardContentProps = React.ComponentProps<"div">
/** Props of the card footer slot. */
export type CardFooterProps = React.ComponentProps<"div">

function Card({ className, size = "default", variant = "default", ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      className={cn(
        "group/card pui:flex pui:flex-col pui:gap-(--card-spacing) pui:overflow-hidden pui:rounded-xl pui:bg-card pui:py-(--card-spacing) pui:text-caption pui:text-card-foreground pui:ring-1 pui:ring-foreground/10 pui:[--card-spacing:--spacing(4)] pui:has-data-[slot=card-footer]:pb-0 pui:has-[>img:first-child]:pt-0 pui:data-[size=sm]:[--card-spacing:--spacing(3)] pui:data-[size=sm]:has-data-[slot=card-footer]:pb-0 pui:*:[img:first-child]:rounded-t-xl pui:*:[img:last-child]:rounded-b-xl",
        variant !== "default" &&
          "pui:min-w-0 pui:rounded-3xl pui:py-6 pui:text-body pui:ring-1 pui:ring-border pui:[--card-spacing:--spacing(6)] pui:has-data-[slot=card-footer]:pb-6",
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header pui:@container/card-header pui:grid pui:auto-rows-min pui:items-start pui:gap-1 pui:rounded-t-xl pui:px-(--card-spacing) pui:has-data-[slot=card-action]:grid-cols-[1fr_auto] pui:has-data-[slot=card-description]:grid-rows-[auto_auto] pui:[.border-b]:pb-(--card-spacing) pui:group-data-[variant^=product]/card:min-w-0 pui:group-data-[variant=product]/card:gap-3 pui:group-data-[variant=product-image]/card:gap-2",
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, render, ...props }: CardTitleProps) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        ...{ "data-slot": "card-title" },
        className: cn(
          // The product variants use the generated type-scale tokens (18/28
          // mobile, 24/32 desktop, Bold). The line height stays explicit: the
          // variant selector cannot beat the base `leading-snug` in the
          // cascade, and `leading-7`/`leading-8` carry the same source values.
          "pui:font-heading pui:text-label-sb pui:group-data-[size=sm]/card:text-caption-sb pui:group-data-[variant^=product]/card:min-w-0 pui:group-data-[variant^=product]/card:max-w-full pui:group-data-[variant^=product]/card:text-title-xs-mobile pui:group-data-[variant^=product]/card:leading-7 pui:group-data-[variant^=product]/card:wrap-anywhere pui:tablet:group-data-[variant^=product]/card:text-title-xs pui:tablet:group-data-[variant^=product]/card:leading-8",
          className,
        ),
      },
      props,
    ),
    render,
    state: { slot: "card-title" },
  })
}

function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        "pui:text-caption pui:text-muted-foreground pui:group-data-[variant^=product]/card:min-w-0 pui:group-data-[variant^=product]/card:wrap-anywhere pui:group-data-[variant=product-image]/card:text-body",
        className,
      )}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: CardActionProps) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "pui:col-start-2 pui:row-span-2 pui:row-start-1 pui:self-start pui:justify-self-end",
        className,
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: CardContentProps) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "pui:px-(--card-spacing) pui:group-data-[variant^=product]/card:min-w-0 pui:group-data-[variant^=product]/card:wrap-anywhere",
        className,
      )}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "pui:flex pui:items-center pui:rounded-b-xl pui:border-t pui:bg-muted/50 pui:p-(--card-spacing) pui:group-data-[variant^=product]/card:border-0 pui:group-data-[variant^=product]/card:bg-transparent pui:group-data-[variant^=product]/card:py-0",
        className,
      )}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent }
