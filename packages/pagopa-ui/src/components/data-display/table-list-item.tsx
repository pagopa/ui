import * as React from "react"
import { cn } from "@/lib/cn"
import { useLinkComponent } from "@/lib/ui-provider"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button, buttonVariants } from "@/components/primitives/button"

interface TableListItemField {
  /** Field label (source `.TableListItemField` Label). */
  label?: string
  /** Field value: body text, monospace with `mono`, or caller content such as a Chip. */
  value: React.ReactNode
  /** Optional decorative artwork (source icon slot). */
  icon?: React.ReactNode
  /** Renders the value in the source monospace face (Body/Mono). */
  mono?: boolean
}

type TableListItemAction = { label?: string; ariaLabel?: string } & (
  | { href: string; onPress?: never }
  | { href?: never; onPress: () => void }
)

type TableListItemProps = Omit<React.ComponentProps<"li">, "onClick"> & {
  /** Labelled values composing the row; the first one is the flexible field. */
  fields: TableListItemField[]
  /**
   * Text action of the row (source Button, "Apri" slot). Navigation stays a
   * native link; callbacks render a native button. Use `ariaLabel` to give
   * repeated row actions their own context ("Apri Titolo campagna").
   */
  action?: TableListItemAction
}

function TableListItem({
  fields,
  action,
  actionFallbackLabel = "Apri",
  className,
  ...props
}: TableListItemProps & {
  /** Text of an action row that carries no label. @default "Apri" */
  actionFallbackLabel?: string
}) {
  const Link = useLinkComponent()
  const actionLabel = action?.label ?? actionFallbackLabel
  const actionIcon = <PagoPAIcon name="arrow" variant="right" />
  return (
    <li
      className={cn("@container/list-item rounded-lg border bg-background", className)}
      {...props}
    >
      <div className="flex w-full flex-col gap-4 p-6 @min-narrow/list-item:flex-row @min-narrow/list-item:items-center @min-narrow/list-item:gap-20">
        <div className="flex min-w-0 flex-1 flex-col gap-4 @min-narrow/list-item:flex-row @min-narrow/list-item:items-start @min-narrow/list-item:gap-20">
          {fields.map((field, index) => (
            <div
              key={index}
              className={cn(
                "flex min-w-0 items-center gap-2",
                index === 0 ? "@min-narrow/list-item:flex-1" : "@min-narrow/list-item:shrink-0",
              )}
            >
              {field.icon ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none shrink-0 text-choice-icon [&_svg:not([class*='size-'])]:size-6"
                >
                  {field.icon}
                </span>
              ) : null}
              <span className="grid min-w-0 gap-1">
                {field.label ? (
                  <span className="text-body-small wrap-anywhere text-muted-foreground">
                    {field.label}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "wrap-anywhere",
                    field.mono
                      ? "font-mono text-mono text-foreground"
                      : "text-body-sb text-foreground",
                  )}
                >
                  {field.value}
                </span>
              </span>
            </div>
          ))}
        </div>
        {action ? (
          action.href !== undefined ? (
            <Link
              href={action.href}
              aria-label={action.ariaLabel}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "self-end px-0 @min-narrow/list-item:self-auto",
              )}
            >
              {actionLabel}
              {actionIcon}
            </Link>
          ) : (
            <Button
              type="button"
              variant="ghost"
              aria-label={action.ariaLabel}
              className="self-end px-0 @min-narrow/list-item:self-auto"
              onClick={action.onPress}
            >
              {actionLabel}
              {actionIcon}
            </Button>
          )
        ) : null}
      </div>
    </li>
  )
}

export { TableListItem, type TableListItemAction, type TableListItemField }
