"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

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
  downloadLabel: downloadLabelProp,
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
  /** Accessible name of the download action. @default messages.paymentModule.downloadLabel */
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
  const t = useMessages("paymentModule")
  const downloadLabel = downloadLabelProp ?? t.downloadLabel

  const content = loading ? (
    <div className="pui:grid pui:gap-1">
      <Skeleton className="pui:h-6 pui:w-60 pui:max-w-full pui:rounded-4 pui:bg-muted" />
      <Skeleton className="pui:h-4 pui:w-89 pui:max-w-full pui:rounded-4 pui:bg-muted" />
      <Skeleton className="pui:h-4 pui:w-42 pui:max-w-full pui:rounded-4 pui:bg-muted" />
    </div>
  ) : (
    <>
      <div className="pui:flex pui:min-w-0 pui:flex-1 pui:flex-col pui:gap-4 pui:@md/payment-module:flex-row pui:@md/payment-module:items-center pui:@md/payment-module:gap-6">
        <div
          data-slot="payment-module-info"
          className="pui:grid pui:min-w-0 pui:flex-1 pui:gap-3 pui:@md/payment-module:gap-1.5"
        >
          <p data-slot="payment-module-code" className="pui:text-body-sb">
            {code}
          </p>
          {metadata.map((row) => (
            <p
              key={row.label}
              data-slot="payment-module-metadata"
              className="pui:flex pui:flex-wrap pui:items-center pui:gap-1 pui:text-label-mini pui:text-muted-foreground"
            >
              <span>{row.label}</span>
              <span className="pui:text-label-mini-sb">{row.value}</span>
            </p>
          ))}
          {suggestion ? (
            <p
              data-slot="payment-module-suggestion"
              className="pui:flex pui:items-center pui:gap-1 pui:text-caption-sb pui:text-han-purple"
            >
              <span
                aria-hidden="true"
                className="pui:flex pui:size-5 pui:shrink-0 pui:items-center pui:justify-center"
              >
                {suggestion.icon ?? <PagoPAIcon name="how_to_reg" size={20} />}
              </span>
              {suggestion.label}
            </p>
          ) : null}
        </div>
        {price || onDownload || onSelect ? (
          <span
            data-slot="payment-module-tail"
            className={cn(
              "pui:flex pui:shrink-0 pui:items-center pui:justify-end",
              onSelect ? "pui:gap-2" : "pui:gap-4",
            )}
          >
            {price ? (
              <span className="pui:grid pui:text-right">
                <span className="pui:text-body-sb pui:text-primary">{price.amount}</span>
                {price.detail ? (
                  <span className="pui:text-caption-sb pui:text-muted-foreground">
                    {price.detail}
                  </span>
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
                className="pui:relative pui:size-6 pui:min-h-0 pui:px-0 pui:after:absolute pui:after:-inset-2.5"
              >
                <PagoPAIcon name="download" className="pui:size-6" />
              </Button>
            ) : null}
            {onSelect ? (
              <RadioGroupItem value="selected" className="pui:shrink-0 pui:self-center" />
            ) : null}
          </span>
        ) : null}
      </div>
      {actions ? (
        <div
          data-slot="payment-module-actions"
          className="pui:flex pui:flex-wrap pui:justify-end pui:gap-6"
        >
          {actions}
        </div>
      ) : null}
    </>
  )

  if (onSelect) {
    return (
      <div className="pui:@container/payment-module pui:w-full pui:min-w-0">
        <RadioGroup
          data-slot="payment-module"
          value={selected ? "selected" : null}
          onValueChange={() => onSelect(true)}
          name={selectName}
          className={cn(
            "pui:flex pui:w-full pui:min-w-0 pui:flex-col pui:gap-6 pui:rounded-lg pui:border pui:border-border pui:bg-card pui:p-4",
            className,
          )}
          {...props}
        >
          <label className="pui:block">{content}</label>
        </RadioGroup>
      </div>
    )
  }

  return (
    <div className="pui:@container/payment-module pui:w-full pui:min-w-0">
      <div
        data-slot="payment-module"
        className={cn(
          "pui:flex pui:w-full pui:min-w-0 pui:flex-col pui:gap-6 pui:rounded-lg pui:border pui:border-border pui:bg-card pui:p-4",
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
