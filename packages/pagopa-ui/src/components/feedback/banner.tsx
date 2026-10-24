import * as React from "react"
import { cn } from "@/lib/cn"

import { X } from "@/components/primitives/icons"

type BannerColor = "white" | "primary" | "grey"
type BannerHierarchy = "primary" | "secondary" | "tertiary"
type BannerDirection = "horizontal" | "vertical"

const bannerColors: Record<BannerColor, string> = {
  white: "border-border bg-background",
  primary: "border-selection-border bg-selection-soft",
  grey: "border-border bg-muted",
}

interface BannerBaseProps {
  color?: BannerColor
  hierarchy?: BannerHierarchy
  direction?: BannerDirection
  /** Optional heading; when absent, `label` names the banner. */
  title?: React.ReactNode
  children?: React.ReactNode
  actions?: React.ReactNode
  /** Optional Chip slot (source Primary hierarchy). */
  chip?: React.ReactNode
  /** Optional icon (White and Primary Tertiary banners). */
  icon?: React.ReactNode
  /** Optional Push pictogram. */
  pictogram?: React.ReactNode
  onDismiss?: () => void
  titleAs?: "h2" | "h3" | "h4"
  /** Accessible name of the dismiss control. @default "Chiudi avviso" */
  dismissLabel?: string
  className?: string
}

type BannerProps = BannerBaseProps &
  (
    | {
        title: React.ReactNode
        /** Accessible name; required only when the banner has no title. */
        label?: string
      }
    | {
        title?: undefined
        /** Accessible name; required only when the banner has no title. */
        label: string
      }
  )

function Banner({
  color = "white",
  hierarchy = "secondary",
  direction = "horizontal",
  title,
  label,
  children,
  actions,
  chip,
  icon,
  pictogram,
  onDismiss,
  titleAs: Title = "h2",
  dismissLabel = "Chiudi avviso",
  className,
}: BannerProps) {
  const primary = hierarchy === "primary"
  const secondary = hierarchy === "secondary"
  const tertiary = hierarchy === "tertiary"
  const titleClassName = cn(
    tertiary
      ? "text-label-sb"
      : direction === "vertical"
        ? "text-title-xs-mobile"
        : "text-title-xs-mobile md:text-title-xs",
  )
  const descriptionClassName = cn(
    "text-muted-foreground",
    tertiary ? "text-label-mini" : "text-body",
  )

  return (
    <section
      role="status"
      aria-label={title ? undefined : label}
      data-slot="banner"
      className={cn(
        "relative w-full rounded-lg border p-4",
        bannerColors[color],
        primary && "flex gap-4",
        secondary && "flex flex-col gap-2",
        tertiary && "flex items-start gap-2",
        className,
      )}
    >
      {primary ? (
        <>
          <span
            aria-hidden="true"
            data-slot="banner-accent"
            className="w-1 shrink-0 self-stretch rounded-full bg-primary"
          />
          <div data-slot="banner-content" className="min-w-0 flex-1">
            {chip ? (
              <div data-slot="banner-chip" className="flex">
                {chip}
              </div>
            ) : null}
            {direction === "horizontal" ? (
              <div
                className={cn(
                  "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-8",
                  chip && "mt-2",
                )}
              >
                <div className="col-start-1 row-start-1 flex min-w-0 flex-col">
                  {title ? (
                    <Title data-slot="banner-title" className={cn(titleClassName, "min-w-0")}>
                      {title}
                    </Title>
                  ) : null}
                  {children ? (
                    <div
                      data-slot="banner-description"
                      className={cn(descriptionClassName, title && "mt-2", "min-w-0")}
                    >
                      {children}
                    </div>
                  ) : null}
                  {actions ? (
                    <div data-slot="banner-actions" className="mt-4 flex flex-wrap gap-3">
                      {actions}
                    </div>
                  ) : null}
                </div>
                {pictogram ? (
                  <span
                    aria-hidden="true"
                    data-slot="banner-pictogram"
                    className="col-start-2 row-start-1 size-14 shrink-0 self-center translate-y-2 md:size-20"
                  >
                    {pictogram}
                  </span>
                ) : null}
              </div>
            ) : (
              <div className={cn("flex min-w-0 flex-col", chip && "mt-2")}>
                {title ? (
                  <div className="flex min-w-0 items-start gap-4">
                    <Title
                      data-slot="banner-title"
                      className={cn(titleClassName, "min-w-0 flex-1")}
                    >
                      {title}
                    </Title>
                    {pictogram ? (
                      <span
                        aria-hidden="true"
                        data-slot="banner-pictogram"
                        className="size-14 shrink-0"
                      >
                        {pictogram}
                      </span>
                    ) : null}
                  </div>
                ) : pictogram ? (
                  <span
                    aria-hidden="true"
                    data-slot="banner-pictogram"
                    className="size-14 shrink-0"
                  >
                    {pictogram}
                  </span>
                ) : null}
                {children ? (
                  <div
                    data-slot="banner-description"
                    className={cn(descriptionClassName, title && "mt-4", "min-w-0")}
                  >
                    {children}
                  </div>
                ) : null}
                {actions ? (
                  <div data-slot="banner-actions" className="mt-4 flex flex-wrap gap-3">
                    {actions}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </>
      ) : null}
      {secondary ? (
        <div data-slot="banner-content" className="flex min-w-0 flex-col gap-2">
          {title ? (
            <div className={cn("min-w-0", onDismiss && "pr-12")}>
              <Title data-slot="banner-title" className={titleClassName}>
                {title}
              </Title>
            </div>
          ) : null}
          <div
            className={cn(
              "flex min-w-0",
              direction === "horizontal"
                ? "flex-col gap-4 md:flex-row md:items-center md:gap-8"
                : "flex-col items-start gap-4",
            )}
          >
            {children ? (
              <div
                data-slot="banner-description"
                className={cn(
                  descriptionClassName,
                  "min-w-0",
                  direction === "vertical" && "w-full",
                  direction === "horizontal" && "md:flex-1",
                )}
              >
                {children}
              </div>
            ) : null}
            {actions ? (
              <div data-slot="banner-actions" className="flex shrink-0 flex-wrap gap-3">
                {actions}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {tertiary ? (
        <>
          {icon ? (
            <span aria-hidden="true" data-slot="banner-icon" className="size-6 shrink-0">
              {icon}
            </span>
          ) : null}
          {pictogram ? (
            <span aria-hidden="true" data-slot="banner-pictogram" className="size-10 shrink-0">
              {pictogram}
            </span>
          ) : null}
          <div
            data-slot="banner-content"
            className={cn("flex min-w-0 flex-1 flex-col gap-1", onDismiss && "pr-8")}
          >
            {title ? (
              <Title data-slot="banner-title" className={titleClassName}>
                {title}
              </Title>
            ) : null}
            {children ? (
              <div data-slot="banner-description" className={descriptionClassName}>
                {children}
              </div>
            ) : null}
            {actions ? (
              <div data-slot="banner-actions" className="mt-2 flex flex-wrap gap-3">
                {actions}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
      {onDismiss ? (
        <button
          type="button"
          aria-label={dismissLabel}
          onClick={onDismiss}
          data-slot="banner-dismiss"
          className="absolute right-1 top-1 z-10 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </section>
  )
}

export { Banner, type BannerColor, type BannerDirection, type BannerHierarchy }
