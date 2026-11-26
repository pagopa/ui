"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

type BannerColor = "white" | "primary" | "grey"
type BannerHierarchy = "primary" | "secondary" | "tertiary"
type BannerDirection = "horizontal" | "vertical"

const bannerColors: Record<BannerColor, string> = {
  white: "pui:border-border pui:bg-background",
  primary: "pui:border-selection-border pui:bg-selection-soft",
  grey: "pui:border-border pui:bg-muted",
}

export interface BannerBaseProps {
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
  /** Accessible name of the dismiss control. @default messages.banner.dismissLabel */
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
  dismissLabel: dismissLabelProp,
  className,
}: BannerProps) {
  const t = useMessages("banner")
  const dismissLabel = dismissLabelProp ?? t.dismissLabel

  const primary = hierarchy === "primary"
  const secondary = hierarchy === "secondary"
  const tertiary = hierarchy === "tertiary"
  const titleClassName = cn(
    tertiary
      ? "pui:text-label-sb"
      : direction === "vertical"
        ? "pui:text-title-xs-mobile"
        : "pui:text-title-xs-mobile pui:tablet-md:text-title-xs",
  )
  const descriptionClassName = cn(
    "pui:text-muted-foreground",
    tertiary ? "pui:text-label-mini" : "pui:text-body",
  )

  return (
    <section
      role="status"
      aria-label={title ? undefined : label}
      data-slot="banner"
      className={cn(
        "pui:relative pui:w-full pui:rounded-lg pui:border pui:p-4",
        bannerColors[color],
        primary && "pui:flex pui:gap-4",
        secondary && "pui:flex pui:flex-col pui:gap-2",
        tertiary && "pui:flex pui:items-start pui:gap-2",
        className,
      )}
    >
      {primary ? (
        <>
          <span
            aria-hidden="true"
            data-slot="banner-accent"
            className="pui:w-1 pui:shrink-0 pui:self-stretch pui:rounded-full pui:bg-primary"
          />
          <div data-slot="banner-content" className="pui:min-w-0 pui:flex-1">
            {chip ? (
              <div data-slot="banner-chip" className="pui:flex">
                {chip}
              </div>
            ) : null}
            {direction === "horizontal" ? (
              <div
                className={cn(
                  "pui:grid pui:min-w-0 pui:grid-cols-[minmax(0,1fr)_auto] pui:gap-x-8",
                  chip && "pui:mt-2",
                )}
              >
                <div className="pui:col-start-1 pui:row-start-1 pui:flex pui:min-w-0 pui:flex-col">
                  {title ? (
                    <Title data-slot="banner-title" className={cn(titleClassName, "pui:min-w-0")}>
                      {title}
                    </Title>
                  ) : null}
                  {children ? (
                    <div
                      data-slot="banner-description"
                      className={cn(descriptionClassName, title && "pui:mt-2", "pui:min-w-0")}
                    >
                      {children}
                    </div>
                  ) : null}
                  {actions ? (
                    <div
                      data-slot="banner-actions"
                      className="pui:mt-4 pui:flex pui:flex-wrap pui:gap-3"
                    >
                      {actions}
                    </div>
                  ) : null}
                </div>
                {pictogram ? (
                  <span
                    aria-hidden="true"
                    data-slot="banner-pictogram"
                    className="pui:col-start-2 pui:row-start-1 pui:size-14 pui:shrink-0 pui:self-center pui:translate-y-2 pui:tablet-md:size-20"
                  >
                    {pictogram}
                  </span>
                ) : null}
              </div>
            ) : (
              <div className={cn("pui:flex pui:min-w-0 pui:flex-col", chip && "pui:mt-2")}>
                {title ? (
                  <div className="pui:flex pui:min-w-0 pui:items-start pui:gap-4">
                    <Title
                      data-slot="banner-title"
                      className={cn(titleClassName, "pui:min-w-0 pui:flex-1")}
                    >
                      {title}
                    </Title>
                    {pictogram ? (
                      <span
                        aria-hidden="true"
                        data-slot="banner-pictogram"
                        className="pui:size-14 pui:shrink-0"
                      >
                        {pictogram}
                      </span>
                    ) : null}
                  </div>
                ) : pictogram ? (
                  <span
                    aria-hidden="true"
                    data-slot="banner-pictogram"
                    className="pui:size-14 pui:shrink-0"
                  >
                    {pictogram}
                  </span>
                ) : null}
                {children ? (
                  <div
                    data-slot="banner-description"
                    className={cn(descriptionClassName, title && "pui:mt-4", "pui:min-w-0")}
                  >
                    {children}
                  </div>
                ) : null}
                {actions ? (
                  <div
                    data-slot="banner-actions"
                    className="pui:mt-4 pui:flex pui:flex-wrap pui:gap-3"
                  >
                    {actions}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </>
      ) : null}
      {secondary ? (
        <div data-slot="banner-content" className="pui:flex pui:min-w-0 pui:flex-col pui:gap-2">
          {title ? (
            <div className={cn("pui:min-w-0", onDismiss && "pui:pr-12")}>
              <Title data-slot="banner-title" className={titleClassName}>
                {title}
              </Title>
            </div>
          ) : null}
          <div
            className={cn(
              "pui:flex pui:min-w-0",
              direction === "horizontal"
                ? "pui:flex-col pui:gap-4 pui:tablet-md:flex-row pui:tablet-md:items-center pui:tablet-md:gap-8"
                : "pui:flex-col pui:items-start pui:gap-4",
            )}
          >
            {children ? (
              <div
                data-slot="banner-description"
                className={cn(
                  descriptionClassName,
                  "pui:min-w-0",
                  direction === "vertical" && "pui:w-full",
                  direction === "horizontal" && "pui:tablet-md:flex-1",
                )}
              >
                {children}
              </div>
            ) : null}
            {actions ? (
              <div
                data-slot="banner-actions"
                className="pui:flex pui:shrink-0 pui:flex-wrap pui:gap-3"
              >
                {actions}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
      {tertiary ? (
        <>
          {icon ? (
            <span aria-hidden="true" data-slot="banner-icon" className="pui:size-6 pui:shrink-0">
              {icon}
            </span>
          ) : null}
          {pictogram ? (
            <span
              aria-hidden="true"
              data-slot="banner-pictogram"
              className="pui:size-10 pui:shrink-0"
            >
              {pictogram}
            </span>
          ) : null}
          <div
            data-slot="banner-content"
            className={cn(
              "pui:flex pui:min-w-0 pui:flex-1 pui:flex-col pui:gap-1",
              onDismiss && "pui:pr-8",
            )}
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
              <div data-slot="banner-actions" className="pui:mt-2 pui:flex pui:flex-wrap pui:gap-3">
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
          className="pui:absolute pui:right-1 pui:top-1 pui:z-10 pui:flex pui:size-11 pui:shrink-0 pui:items-center pui:justify-center pui:rounded-full pui:hover:bg-foreground/5 pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-current"
        >
          <PagoPAIcon name="close" className="pui:size-4" />
        </button>
      ) : null}
    </section>
  )
}

export { Banner }
export type { BannerColor, BannerDirection, BannerHierarchy, BannerProps }
