"use client"

import { useId, type ComponentProps, type ReactNode } from "react"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button } from "@/components/primitives/button"
import { Heading, type HeadingTag } from "@/components/primitives/heading"
import { cn } from "@/lib/cn"
import { useLinkComponent } from "@/lib/ui-provider"

export interface IdentityProviderPickerOption {
  id: string
  label: string
  logo: ReactNode
  href: string
  target?: ComponentProps<"a">["target"]
  rel?: string
  onClick?: ComponentProps<"a">["onClick"]
}

export interface IdentityProviderPickerProps {
  title: string
  closeLabel: string
  onClose: () => void
  providers: readonly IdentityProviderPickerOption[]
  device?: "mobile" | "desktop"
  /** Heading tag of the module title. @default "h2" */
  titleAs?: HeadingTag
  className?: string
}

export interface IdentityProviderPickerRowProps extends IdentityProviderPickerOption {
  className?: string
}

function IdentityProviderPickerRow({
  id,
  label,
  logo,
  href,
  target,
  rel,
  onClick,
  className,
}: IdentityProviderPickerRowProps) {
  const Link = useLinkComponent()
  return (
    <Link
      data-slot="identity-provider-picker"
      className={cn(
        "pui:flex pui:min-h-15 pui:w-full pui:items-center pui:justify-between pui:gap-3 pui:rounded-lg pui:bg-background pui:p-4 pui:text-left pui:text-muted-foreground pui:ring-1 pui:ring-inset pui:ring-border pui:outline-none pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring pui:forced-colors:ring-0 pui:forced-colors:outline-1 pui:forced-colors:outline-solid pui:forced-colors:outline-[CanvasText]",
        className,
      )}
      data-id-module-provider={id}
      href={href}
      onClick={onClick}
      rel={rel ?? (target === "_blank" ? "noreferrer" : undefined)}
      target={target}
    >
      <span
        className="pui:min-w-0 pui:text-caption-sb pui:leading-4 pui:text-muted-foreground"
        data-id-module-provider-label="true"
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        className="pui:flex pui:h-7 pui:w-29 pui:shrink-0 pui:items-center pui:justify-center"
        data-id-module-provider-logo="true"
      >
        {logo}
      </span>
    </Link>
  )
}

function IdentityProviderPickerView({
  title,
  closeLabel,
  onClose,
  providers,
  device = "mobile",
  titleAs = "h2",
  className,
}: IdentityProviderPickerProps) {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      // The source draws the module 410 wide from the tablet device step up
      // (731:20387); below 600 it takes the available width.
      className={cn(
        "pui:w-full pui:max-w-full pui:bg-background pui:text-foreground pui:tablet:w-(--pui-id-module-width)",
        className,
      )}
      data-id-module="true"
      data-device={device}
    >
      <header
        className={cn(
          "pui:flex pui:items-center pui:gap-6 pui:px-6",
          device === "desktop" ? "pui:min-h-20 pui:py-4" : "pui:min-h-19 pui:py-4",
        )}
        data-id-module-header="true"
      >
        <Heading
          as={titleAs}
          className={cn(
            "pui:min-w-0 pui:flex-1",
            device === "desktop" ? "pui:text-title-xs" : "pui:text-title-xs-mobile",
          )}
          data-id-module-title="true"
          id={titleId}
        >
          {title}
        </Heading>
        <Button
          aria-label={closeLabel}
          className="pui:shrink-0 pui:justify-end pui:text-foreground pui:hover:bg-transparent pui:hover:text-foreground"
          data-id-module-close="true"
          onClick={onClose}
          size="icon"
          type="button"
          variant="ghost"
        >
          <PagoPAIcon name="close" size={24} />
        </Button>
      </header>
      <ul
        className="pui:m-0 pui:flex pui:w-full pui:list-none pui:flex-col pui:gap-2 pui:px-6 pui:pb-6"
        data-id-module-providers="true"
      >
        {providers.map((provider) => (
          <li className="pui:min-w-0" key={provider.id}>
            <IdentityProviderPickerRow {...provider} />
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * Provider chooser for digital identity sign-in: a labelled section listing the
 * caller's providers as links, with a close action and an optional desktop step.
 *
 * Figma: IDModule (node 731:20386)
 */
const IdentityProviderPicker = Object.assign(IdentityProviderPickerView, {
  Provider: IdentityProviderPickerRow,
})

export { IdentityProviderPicker, IdentityProviderPickerRow, IdentityProviderPickerView }
