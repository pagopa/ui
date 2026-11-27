"use client"

import * as React from "react"
import { Avatar } from "@/components/content/avatar"
import { Chip } from "@/components/inputs/chips"
import { Icon } from "@/components/icons/icon"
import { Default as CachedIcon } from "@/components/icons/generated/cached"
import { Button } from "@/components/primitives/button"
import { RadioGroup, RadioGroupItem } from "@/components/primitives/radio-group"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

interface ProductAction {
  label: string
  icon?: React.ReactNode
  onClick?: () => void
}

type ProductModuleProps = Omit<
  React.ComponentProps<"div">,
  "defaultChecked" | "defaultValue" | "onSelect" | "title"
> & {
  /** Optional artwork; the legacy composition falls back to a placeholder avatar. */
  avatar?: React.ReactNode
  /** Optional status chips; the legacy composition derives them from `status`. */
  chips?: React.ReactNode
  /** Optional supporting copy. */
  description?: string
  /** Standalone radio selection. @default false */
  selected?: boolean
  /** Radio change handler; with `title` it selects the standalone radio form. */
  onSelect?: (selected: boolean) => void
  /** Name of the native radio input. */
  selectName?: string
  /** Optional action of the `action` variant. */
  action?: ProductAction
  /** Legacy status text. */
  status?: string
  /** Legacy visible status text when none is passed. @default messages.productModule.legacyStatusLabel */
  legacyStatusLabel?: string
  /** Value of the native radio input. */
  value?: string
  /** Overrides the composition: `radio` or `action`. */
  variant?: "radio" | "action"
  /** Legacy action label. @default messages.productModule.actionLabel */
  actionLabel?: string
  /** Legacy action handler. */
  onOpen?: () => void
  /** Disables the action or the standalone radio. */
  disabled?: boolean
} & (
    | {
        /** Row title (current API). */
        title: string
        name?: never
      }
    | {
        /** Row name (legacy `name`/`status` composition). */
        name: string
        title?: never
      }
  )

function ProductModule({
  avatar,
  title,
  name,
  chips,
  description,
  selected = false,
  onSelect,
  selectName,
  action,
  status,
  value,
  variant: requestedVariant,
  actionLabel: actionLabelProp,
  legacyStatusLabel: legacyStatusLabelProp,
  disabled,
  onOpen,
  className,
  ...props
}: ProductModuleProps) {
  const t = useMessages("productModule")
  const actionLabel = actionLabelProp ?? t.actionLabel
  const legacyStatusLabel = legacyStatusLabelProp ?? t.legacyStatusLabel

  const titleId = React.useId()
  const statusId = React.useId()
  const descriptionId = React.useId()
  const legacy = title === undefined
  const standalone = !legacy && Boolean(onSelect)
  const variant = standalone
    ? "radio"
    : legacy
      ? (requestedVariant ?? (onOpen ? "action" : "radio"))
      : action
        ? "action"
        : undefined
  const statusText = legacy ? (status ?? legacyStatusLabel) : status
  const visibleAvatar = avatar ?? (legacy ? <Avatar alt="" size="small" /> : null)
  const visibleChips =
    chips ??
    (statusText ? (
      <Chip size="compact" variant="default" appearance="solid" className="pui:shrink-0">
        <span data-slot="product-module-status-label">{statusText}</span>
      </Chip>
    ) : null)
  const labelledBy = visibleChips ? `${titleId} ${statusId}` : titleId
  const actionIcon = legacy ? undefined : action?.icon
  // The props union guarantees a name outside the standalone form.
  const radioValue = standalone ? "selected" : (value ?? name)

  const content = (
    <div
      data-slot="product-module-content"
      className="pui:flex pui:w-full pui:min-w-0 pui:flex-1 pui:items-center pui:gap-3"
    >
      {visibleAvatar ? (
        <span
          data-slot="product-module-avatar"
          aria-hidden={legacy || undefined}
          className="pui:inline-flex pui:shrink-0"
        >
          {visibleAvatar}
        </span>
      ) : null}
      <div
        data-slot="product-module-copy"
        className="pui:grid pui:min-w-0 pui:flex-1 pui:gap-1 pui:@min-compact/product-module:gap-0.5"
      >
        <div className="pui:flex pui:flex-col pui:items-start pui:gap-1 pui:@min-compact/product-module:flex-row pui:@min-compact/product-module:items-center pui:@min-compact/product-module:gap-2">
          <span
            id={titleId}
            data-slot="product-module-title"
            className="pui:min-w-0 pui:break-words pui:text-body-sb pui:text-foreground"
          >
            {title ?? name}
          </span>
          {visibleChips ? (
            <span
              id={statusId}
              data-slot="product-module-status"
              className="pui:inline-flex pui:shrink-0"
            >
              {visibleChips}
            </span>
          ) : null}
        </div>
        {description ? (
          <p
            id={descriptionId}
            data-slot="product-module-description"
            className="pui:min-w-0 pui:break-words pui:text-label-mini pui:text-muted-foreground"
          >
            {description}
          </p>
        ) : null}
      </div>
    </div>
  )

  if (variant !== "radio") {
    return (
      <div className="pui:@container/product-module pui:w-full pui:min-w-0">
        <div
          data-slot="product-module"
          data-variant={variant}
          className={cn(
            "pui:flex pui:w-full pui:min-w-0 pui:flex-col pui:items-start pui:gap-4 pui:rounded-lg pui:border pui:border-border pui:bg-card pui:p-4 pui:@min-compact/product-module:flex-row pui:@min-compact/product-module:items-center",
            className,
          )}
          {...props}
        >
          {content}
          {variant === "action" ? (
            <Button
              data-product-module-action
              type="button"
              variant="ghost"
              disabled={disabled || (legacy && !onOpen)}
              onClick={legacy ? onOpen : action?.onClick}
              // Source action is a 24px hug: the visible box stays 24px and the
              // >=44px pointer target comes from the invisible ::after expansion.
              className="pui:relative pui:min-h-0 pui:gap-2 pui:px-0 pui:after:absolute pui:after:inset-x-0 pui:after:-inset-y-2.5"
            >
              <span data-product-module-action-label>{legacy ? actionLabel : action?.label}</span>
              <span
                data-product-module-action-icon
                aria-hidden={legacy || undefined}
                className="pui:inline-flex pui:size-6 pui:shrink-0 pui:items-center pui:justify-center"
              >
                {actionIcon ?? <Icon source={CachedIcon} size={24} />}
              </span>
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  const row = (
    <label
      data-slot="product-module"
      data-variant="radio"
      className={cn(
        "pui:flex pui:w-full pui:min-w-0 pui:items-center pui:gap-4 pui:rounded-lg pui:border pui:border-border pui:bg-card pui:p-4",
        disabled ? "pui:cursor-not-allowed" : "pui:cursor-pointer",
        className,
      )}
    >
      {content}
      {radioValue === undefined ? null : (
        <RadioGroupItem
          value={radioValue}
          disabled={disabled}
          aria-labelledby={labelledBy}
          aria-describedby={description ? descriptionId : undefined}
        />
      )}
    </label>
  )

  if (standalone && onSelect) {
    return (
      <RadioGroup
        value={selected ? "selected" : null}
        onValueChange={() => onSelect(true)}
        name={selectName}
        disabled={disabled}
        className="pui:@container/product-module pui:w-full pui:min-w-0"
        {...props}
      >
        {row}
      </RadioGroup>
    )
  }

  return (
    <div className="pui:@container/product-module pui:w-full pui:min-w-0" {...props}>
      {row}
    </div>
  )
}

export { ProductModule }
export type { ProductAction, ProductModuleProps }
