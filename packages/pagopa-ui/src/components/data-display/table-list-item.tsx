"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useLinkComponent, useMessages } from "@/lib/ui-provider"

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
  actionFallbackLabel: actionFallbackLabelProp,
  className,
  ...props
}: TableListItemProps & {
  /** Text of an action row that carries no label. @default messages.tableListItem.actionFallbackLabel */
  actionFallbackLabel?: string
}) {
  const t = useMessages("tableListItem")
  const actionFallbackLabel = actionFallbackLabelProp ?? t.actionFallbackLabel

  const Link = useLinkComponent()
  const actionLabel = action?.label ?? actionFallbackLabel
  const actionIcon = <PagoPAIcon name="arrow" variant="right" />
  return (
    <li
      data-slot="table-list-item"
      className={cn(
        "pui:@container/list-item pui:rounded-lg pui:border pui:bg-background",
        className,
      )}
      {...props}
    >
      <div className="pui:flex pui:w-full pui:flex-col pui:gap-4 pui:p-6 pui:@min-narrow/list-item:flex-row pui:@min-narrow/list-item:items-center pui:@min-narrow/list-item:gap-20">
        <div className="pui:flex pui:min-w-0 pui:flex-1 pui:flex-col pui:gap-4 pui:@min-narrow/list-item:flex-row pui:@min-narrow/list-item:items-start pui:@min-narrow/list-item:gap-20">
          {fields.map((field, index) => (
            <div
              key={index}
              className={cn(
                "pui:flex pui:min-w-0 pui:items-center pui:gap-2",
                index === 0
                  ? "pui:@min-narrow/list-item:flex-1"
                  : "pui:@min-narrow/list-item:shrink-0",
              )}
            >
              {field.icon ? (
                <span
                  aria-hidden="true"
                  className="pui:pointer-events-none pui:shrink-0 pui:text-choice-icon pui:[&_svg:not([class*='size-'])]:size-6"
                >
                  {field.icon}
                </span>
              ) : null}
              <span className="pui:grid pui:min-w-0 pui:gap-1">
                {field.label ? (
                  <span className="pui:text-body-small pui:wrap-anywhere pui:text-muted-foreground">
                    {field.label}
                  </span>
                ) : null}
                <span
                  className={cn(
                    "pui:wrap-anywhere",
                    field.mono
                      ? "pui:font-mono pui:text-mono pui:text-foreground"
                      : "pui:text-body-sb pui:text-foreground",
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
                "pui:self-end pui:px-0 pui:@min-narrow/list-item:self-auto",
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
              className="pui:self-end pui:px-0 pui:@min-narrow/list-item:self-auto"
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
