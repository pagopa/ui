"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useLinkComponent, useMessages } from "@/lib/ui-provider"

import { Icon } from "@/components/icons/icon"
import { Default as ArrowRightIcon } from "@/components/icons/generated/arrow"
import { Button, buttonVariants } from "@/components/primitives/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/primitives/card"

type ProductCardProps = Omit<React.ComponentProps<typeof Card>, "variant"> & {
  /** Visible card title; rendered as a genuine heading. */
  title: string
  /** Optional supporting copy; accepts caller-owned rich content. */
  description?: React.ReactNode
  /** Optional product annotation (source Premium line). */
  eyebrow?: string
  /** Optional logo; composed with the cover when `image` is set. */
  logo?: React.ReactNode
  /** Optional status control. */
  chip?: React.ReactNode
  /** Heading level of the title. @default "h3" */
  titleAs?: "h2" | "h3"
  /** Text of the action. @default messages.productCard.actionLabel */
  actionLabel?: string
  /** Cover image; selects the product-image composition. */
  image?: React.ReactNode
} & (
    | {
        /** Native navigation target; exclusive with `onAction`. */
        href: string
        onAction?: never
      }
    | {
        href?: never
        /** Application action; exclusive with `href`. */
        onAction?: () => void
      }
  )

function ProductCard({
  title,
  description,
  eyebrow,
  logo,
  chip,
  titleAs: Title = "h3",
  actionLabel: actionLabelProp,
  href,
  onAction,
  image,
  children,
  className,
  ...props
}: ProductCardProps) {
  const t = useMessages("productCard")
  const actionLabel = actionLabelProp ?? t.actionLabel

  const Link = useLinkComponent()
  if (href !== undefined && onAction !== undefined) {
    throw new Error("ProductCard: choose href or onAction, not both")
  }
  const logoContent = logo ? (
    <div
      data-slot="product-logo"
      className={cn(
        "pui:flex pui:size-16 pui:shrink-0 pui:items-center pui:justify-center pui:rounded-lg pui:bg-card pui:p-2 pui:ring-1 pui:ring-border pui:[&>*]:max-h-full pui:[&>*]:max-w-full",
        image && "pui:absolute pui:-bottom-8 pui:left-6",
      )}
    >
      {logo}
    </div>
  ) : null
  const actionVariant = image ? "outline" : "default"
  // No `font-medium`: the source action is Titillio/500 = our 600, and the
  // Button/anchor base already carries the token weight (CSS 500 renders Regular).
  const actionClassName = "pui:min-h-12 pui:min-w-0 pui:max-w-full pui:px-6 pui:whitespace-normal"
  const actionContent = (
    <>
      {actionLabel}
      {!image ? <Icon source={ArrowRightIcon} /> : null}
    </>
  )
  return (
    <Card
      data-slot="product-card"
      variant={image ? "product-image" : "product"}
      className={cn("pui:h-full", className)}
      {...props}
    >
      {image ? (
        <div className="pui:relative pui:-mt-6">
          <div className="pui:aspect-[272/191] pui:[&>*]:size-full pui:[&>*]:rounded-none pui:[&_img]:size-full pui:[&_img]:object-cover">
            {image}
          </div>
          {logoContent}
        </div>
      ) : null}
      <CardHeader className={cn(image && logo && "pui:pt-6")}>
        <div className="pui:flex pui:min-w-0 pui:items-center pui:gap-2.5">
          {!image ? logoContent : null}
          <div className="pui:flex pui:min-w-0 pui:flex-1 pui:flex-col pui:items-start pui:gap-1">
            {eyebrow ? <p className="pui:text-caption-sb pui:text-primary">{eyebrow}</p> : null}
            {chip ? (
              <div className="pui:flex pui:min-w-0 pui:max-w-full pui:wrap-anywhere pui:[&>*]:max-w-full">
                {chip}
              </div>
            ) : null}
            <CardTitle render={<Title />}>{title}</CardTitle>
          </div>
        </div>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
      {onAction || href !== undefined ? (
        <CardFooter className="pui:mt-auto">
          {href !== undefined ? (
            <Link
              href={href}
              className={cn(buttonVariants({ variant: actionVariant }), actionClassName)}
            >
              {actionContent}
            </Link>
          ) : (
            <Button
              type="button"
              variant={actionVariant}
              className={actionClassName}
              onClick={onAction}
            >
              {actionContent}
            </Button>
          )}
        </CardFooter>
      ) : null}
    </Card>
  )
}

export { ProductCard, type ProductCardProps }
