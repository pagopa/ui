import * as React from "react"
import { Avatar } from "@/components/content/avatar"
import { Chip } from "@/components/inputs/chips"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button } from "@/components/primitives/button"
import { RadioGroup, RadioGroupItem } from "@/components/primitives/radio-group"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

interface ProductAction {
  label: string
  icon?: React.ReactNode
  onClick?: () => void
}

type ProductModuleProps = Omit<React.ComponentProps<"div">, "onSelect" | "title"> & {
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
      <Chip size="compact" variant="default" appearance="solid" className="shrink-0">
        <span data-slot="product-module-status-label">{statusText}</span>
      </Chip>
    ) : null)
  const labelledBy = visibleChips ? `${titleId} ${statusId}` : titleId
  const actionIcon = legacy ? undefined : action?.icon

  const content = (
    <div
      data-slot="product-module-content"
      className="flex w-full min-w-0 flex-1 items-center gap-3"
    >
      {visibleAvatar ? (
        <span
          data-slot="product-module-avatar"
          aria-hidden={legacy || undefined}
          className="inline-flex shrink-0"
        >
          {visibleAvatar}
        </span>
      ) : null}
      <div
        data-slot="product-module-copy"
        className="grid min-w-0 flex-1 gap-1 @md/product-module:gap-0.5"
      >
        <div className="flex flex-col items-start gap-1 @md/product-module:flex-row @md/product-module:items-center @md/product-module:gap-2">
          <span
            id={titleId}
            data-slot="product-module-title"
            className="min-w-0 break-words text-body-sb text-foreground"
          >
            {title ?? name}
          </span>
          {visibleChips ? (
            <span id={statusId} data-slot="product-module-status" className="inline-flex shrink-0">
              {visibleChips}
            </span>
          ) : null}
        </div>
        {description ? (
          <p
            id={descriptionId}
            data-slot="product-module-description"
            className="min-w-0 break-words text-label-mini text-muted-foreground"
          >
            {description}
          </p>
        ) : null}
      </div>
    </div>
  )

  if (variant !== "radio") {
    return (
      <div className="@container/product-module w-full min-w-0">
        <div
          data-slot="product-module"
          data-variant={variant}
          className={cn(
            "flex w-full min-w-0 flex-col items-start gap-4 rounded-lg border border-border bg-card p-4 @md/product-module:flex-row @md/product-module:items-center",
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
              className="relative min-h-0 gap-2 px-0 after:absolute after:inset-x-0 after:-inset-y-2.5"
            >
              <span data-product-module-action-label>{legacy ? actionLabel : action?.label}</span>
              <span
                data-product-module-action-icon
                aria-hidden={legacy || undefined}
                className="inline-flex size-6 shrink-0 items-center justify-center"
              >
                {actionIcon ?? <PagoPAIcon name="cached" size={24} />}
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
        "flex w-full min-w-0 items-center gap-4 rounded-lg border border-border bg-card p-4",
        disabled ? "cursor-not-allowed" : "cursor-pointer",
        className,
      )}
    >
      {content}
      <RadioGroupItem
        value={standalone ? "selected" : (value ?? name)}
        disabled={disabled}
        aria-labelledby={labelledBy}
        aria-describedby={description ? descriptionId : undefined}
      />
    </label>
  )

  if (standalone && onSelect) {
    return (
      <RadioGroup
        value={selected ? "selected" : null}
        onValueChange={() => onSelect(true)}
        name={selectName}
        disabled={disabled}
        className="@container/product-module w-full min-w-0"
        {...props}
      >
        {row}
      </RadioGroup>
    )
  }

  return (
    <div className="@container/product-module w-full min-w-0" {...props}>
      {row}
    </div>
  )
}

export { ProductModule, type ProductAction }
