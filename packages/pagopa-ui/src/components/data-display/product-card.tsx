import * as React from "react"
import { cn } from "@/lib/cn"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
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
  /** Text of the action. @default "Scopri di più" */
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
  actionLabel = "Scopri di più",
  href,
  onAction,
  image,
  children,
  className,
  ...props
}: ProductCardProps) {
  if (href !== undefined && onAction !== undefined) {
    throw new Error("ProductCard: choose href or onAction, not both")
  }
  const logoContent = logo ? (
    <div
      data-slot="product-logo"
      className={cn(
        "flex size-16 shrink-0 items-center justify-center rounded-lg bg-card p-2 ring-1 ring-border [&>*]:max-h-full [&>*]:max-w-full",
        image && "absolute -bottom-8 left-6",
      )}
    >
      {logo}
    </div>
  ) : null
  const actionVariant = image ? "outline" : "default"
  // No `font-medium`: the source action is Titillio/500 = our 600, and the
  // Button/anchor base already carries the token weight (CSS 500 renders Regular).
  const actionClassName = "min-h-12 min-w-0 max-w-full px-6 whitespace-normal"
  const actionContent = (
    <>
      {actionLabel}
      {!image ? <PagoPAIcon name="arrow" variant="right" /> : null}
    </>
  )
  return (
    <Card
      variant={image ? "product-image" : "product"}
      className={cn("h-full", className)}
      {...props}
    >
      {image ? (
        <div className="relative -mt-6">
          <div className="aspect-[272/191] [&>*]:size-full [&>*]:rounded-none [&_img]:size-full [&_img]:object-cover">
            {image}
          </div>
          {logoContent}
        </div>
      ) : null}
      <CardHeader className={cn(image && logo && "pt-6")}>
        <div className="flex min-w-0 items-center gap-2.5">
          {!image ? logoContent : null}
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            {eyebrow ? <p className="text-caption-sb text-primary">{eyebrow}</p> : null}
            {chip ? (
              <div className="flex min-w-0 max-w-full wrap-anywhere [&>*]:max-w-full">{chip}</div>
            ) : null}
            <CardTitle render={<Title />}>{title}</CardTitle>
          </div>
        </div>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
      {onAction || href !== undefined ? (
        <CardFooter className="mt-auto">
          {href !== undefined ? (
            <a
              href={href}
              className={cn(buttonVariants({ variant: actionVariant }), actionClassName)}
            >
              {actionContent}
            </a>
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
