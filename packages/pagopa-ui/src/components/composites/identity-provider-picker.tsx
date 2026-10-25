import { useId, type ComponentProps, type ReactNode } from "react"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button } from "@/components/primitives/button"
import { Heading, type HeadingTag } from "@/components/primitives/heading"
import { cn } from "@/lib/cn"

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

type IdentityProviderPickerRowProps = IdentityProviderPickerOption & {
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
  return (
    <a
      className={cn(
        "flex min-h-15 w-full items-center justify-between gap-3 rounded-lg bg-background p-4 text-left text-muted-foreground ring-1 ring-inset ring-border outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring forced-colors:ring-0 forced-colors:outline-1 forced-colors:outline-solid forced-colors:outline-[CanvasText]",
        className,
      )}
      data-id-module-provider={id}
      href={href}
      onClick={onClick}
      rel={rel ?? (target === "_blank" ? "noreferrer" : undefined)}
      target={target}
    >
      <span
        className="min-w-0 text-caption-sb leading-4 text-muted-foreground"
        data-id-module-provider-label="true"
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        className="flex h-7 w-29 shrink-0 items-center justify-center"
        data-id-module-provider-logo="true"
      >
        {logo}
      </span>
    </a>
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
        "w-full max-w-full bg-background text-foreground tablet:w-(--id-module-width)",
        className,
      )}
      data-id-module="true"
      data-device={device}
    >
      <header
        className={cn(
          "flex items-center gap-6 px-6",
          device === "desktop" ? "min-h-20 py-4" : "min-h-19 py-4",
        )}
        data-id-module-header="true"
      >
        <Heading
          as={titleAs}
          className={cn(
            "min-w-0 flex-1",
            device === "desktop" ? "text-title-xs" : "text-title-xs-mobile",
          )}
          data-id-module-title="true"
          id={titleId}
        >
          {title}
        </Heading>
        <Button
          aria-label={closeLabel}
          className="shrink-0 justify-end text-foreground hover:bg-transparent hover:text-foreground"
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
        className="m-0 flex w-full list-none flex-col gap-2 px-6 pb-6"
        data-id-module-providers="true"
      >
        {providers.map((provider) => (
          <li className="min-w-0" key={provider.id}>
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
const IdentityProviderPicker = Object.assign(IdentityProviderPickerView, { Provider: IdentityProviderPickerRow })

export { IdentityProviderPicker }
