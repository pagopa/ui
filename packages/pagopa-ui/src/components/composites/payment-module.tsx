import * as React from "react"
import { cn } from "@/lib/cn"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button } from "@/components/primitives/button"
import { RadioGroup, RadioGroupItem } from "@/components/primitives/radio-group"
import { Skeleton } from "@/components/primitives/skeleton"

interface PaymentMetadataRow {
  label: string
  value: React.ReactNode
}

interface PaymentSuggestion {
  label: string
  icon?: React.ReactNode
}

interface PaymentPrice {
  amount: string
  detail?: string
}

function PaymentModule({
  code,
  metadata = [],
  suggestion,
  price,
  onDownload,
  downloadLabel = "Scarica",
  selected = false,
  onSelect,
  selectName,
  actions,
  loading = false,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "onSelect"> & {
  /** Payment code (IUV). */
  code: string
  /** Labelled rows; values accept ReactNode, e.g. chips. */
  metadata?: PaymentMetadataRow[]
  /** Recommendation line. */
  suggestion?: PaymentSuggestion
  /** Price label of the Default/Multi-payment variants. */
  price?: PaymentPrice
  /** Download action of the row. */
  onDownload?: () => void
  /** Accessible name of the download action. @default "Scarica" */
  downloadLabel?: string
  /** Multi-payment: the radio selects the notice. */
  selected?: boolean
  onSelect?: (selected: boolean) => void
  /** Native input name when the radio participates in a form group. */
  selectName?: string
  /** Action variant: actions of the row, e.g. the library ButtonGroup. */
  actions?: React.ReactNode
  /** Skeleton state: placeholders replace the content. */
  loading?: boolean
}) {
  const content = loading ? (
    <div className="grid gap-1">
      <Skeleton className="h-6 w-60 max-w-full rounded-4 bg-muted" />
      <Skeleton className="h-4 w-89 max-w-full rounded-4 bg-muted" />
      <Skeleton className="h-4 w-42 max-w-full rounded-4 bg-muted" />
    </div>
  ) : (
    <>
      <div className="flex min-w-0 flex-1 flex-col gap-4 @md/payment-module:flex-row @md/payment-module:items-center @md/payment-module:gap-6">
        <div
          data-slot="payment-module-info"
          className="grid min-w-0 flex-1 gap-3 @md/payment-module:gap-1.5"
        >
          <p data-slot="payment-module-code" className="text-body-sb">
            {code}
          </p>
          {metadata.map((row) => (
            <p
              key={row.label}
              data-slot="payment-module-metadata"
              className="flex flex-wrap items-center gap-1 text-label-mini text-muted-foreground"
            >
              <span>{row.label}</span>
              <span className="text-label-mini-sb">{row.value}</span>
            </p>
          ))}
          {suggestion ? (
            <p
              data-slot="payment-module-suggestion"
              className="flex items-center gap-1 text-caption-sb text-han-purple"
            >
              <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center">
                {suggestion.icon ?? <PagoPAIcon name="how_to_reg" size={20} />}
              </span>
              {suggestion.label}
            </p>
          ) : null}
        </div>
        {price || onDownload || onSelect ? (
          <span
            data-slot="payment-module-tail"
            className={cn("flex shrink-0 items-center justify-end", onSelect ? "gap-2" : "gap-4")}
          >
            {price ? (
              <span className="grid text-right">
                <span className="text-body-sb text-primary">{price.amount}</span>
                {price.detail ? (
                  <span className="text-caption-sb text-muted-foreground">{price.detail}</span>
                ) : null}
              </span>
            ) : null}
            {onDownload ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={downloadLabel}
                onClick={onDownload}
                // Source action is a 24px icon frame: the visible box stays 24px
                // and the >=44px pointer target is the invisible ::after.
                className="relative size-6 min-h-0 px-0 after:absolute after:-inset-2.5"
              >
                <PagoPAIcon name="download" className="size-6" />
              </Button>
            ) : null}
            {onSelect ? <RadioGroupItem value="selected" className="shrink-0 self-center" /> : null}
          </span>
        ) : null}
      </div>
      {actions ? (
        <div data-slot="payment-module-actions" className="flex flex-wrap justify-end gap-6">
          {actions}
        </div>
      ) : null}
    </>
  )

  if (onSelect) {
    return (
      <div className="@container/payment-module w-full min-w-0">
        <RadioGroup
          data-slot="payment-module"
          value={selected ? "selected" : null}
          onValueChange={() => onSelect(true)}
          name={selectName}
          className={cn(
            "flex w-full min-w-0 flex-col gap-6 rounded-lg border border-border bg-card p-4",
            className,
          )}
          {...props}
        >
          <label className="block">{content}</label>
        </RadioGroup>
      </div>
    )
  }

  return (
    <div className="@container/payment-module w-full min-w-0">
      <div
        data-slot="payment-module"
        className={cn(
          "flex w-full min-w-0 flex-col gap-6 rounded-lg border border-border bg-card p-4",
          className,
        )}
        {...props}
      >
        {content}
      </div>
    </div>
  )
}

export { PaymentModule }
