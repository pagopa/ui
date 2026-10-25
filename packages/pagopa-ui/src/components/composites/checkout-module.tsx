import * as React from "react"
import { PaymentProviderLogos } from "@/components/content/payment-provider-logos"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button } from "@/components/primitives/button"
import { Heading, type HeadingTag } from "@/components/primitives/heading"
import { Skeleton } from "@/components/primitives/skeleton"
import { cn } from "@/lib/cn"

interface CheckoutSuggestion {
  label: string
  icon?: React.ReactNode
}

type CheckoutModuleProps = React.ComponentProps<"section"> & {
  /** Caller-owned brand mark. */
  brand?: React.ReactNode
  /** Row title; without it the legacy payment-data composition is used. */
  title?: string
  /** Heading tag of the row title. @default "h2" */
  titleAs?: HeadingTag
  /** Optional supporting copy. */
  description?: string
  /** Recommendation line; a plain string is used as its label. */
  suggestion?: CheckoutSuggestion | string
  /** Text of the action. */
  actionLabel?: string
  /** Preferred action handler. */
  onAction?: () => void
  /** Busy state: placeholders replace the content; takes precedence over `skeleton`. */
  loading?: boolean
  /** Legacy payment amount. */
  amount?: string
  /** Legacy creditor. */
  creditor?: string
  /** Legacy notice code. */
  noticeCode?: string
  /** Legacy label of the notice-code row. @default "Codice avviso" */
  noticeCodeLabel?: string
  /** Legacy row title when `title` is omitted. @default "Payment data" */
  legacyTitle?: string
  /** Legacy supporting copy when neither `description` nor `creditor` is set. @default "Description" */
  legacyDescription?: string
  /** Legacy recommendation line in the compatibility composition. @default "Suggerito perché sei già cliente" */
  legacySuggestion?: string
  /** Action text of the legacy continue handler. @default "Continua" */
  continueLabel?: string
  /** Action text of the legacy edit handler. @default "Modifica" */
  editLabel?: string
  /** Legacy continue handler. */
  onContinue?: () => void
  /** Legacy edit handler. */
  onEdit?: () => void
  /** Shows the action; defaults to whether a handler exists. */
  showButton?: boolean
  /** Hides the description. @default true */
  showDescription?: boolean
  /** Hides the brand slot; the legacy composition defaults to the PayPal mark. */
  showLogo?: boolean
  /** Hides the recommendation line. @default true */
  showSuggestion?: boolean
  /** Busy state used when `loading` is not set. @default false */
  skeleton?: boolean
}

function CheckoutModule({
  brand,
  title,
  titleAs = "h2",
  actionLabel,
  amount,
  creditor,
  description,
  loading,
  noticeCode,
  onAction,
  onContinue,
  onEdit,
  showButton,
  showDescription = true,
  showLogo,
  showSuggestion = true,
  skeleton = false,
  suggestion,
  legacyTitle = "Payment data",
  legacyDescription = "Description",
  legacySuggestion = "Suggerito perché sei già cliente",
  noticeCodeLabel = "Codice avviso",
  continueLabel = "Continua",
  editLabel = "Modifica",
  className,
  ...props
}: CheckoutModuleProps) {
  const headingId = React.useId()
  const legacy = title === undefined
  const heading = title ?? legacyTitle
  const busy = loading ?? skeleton
  const action = onAction ?? onEdit ?? onContinue
  const actionName = actionLabel ?? (onContinue && !onAction && !onEdit ? continueLabel : editLabel)
  const visibleAction = showButton ?? Boolean(action)
  const visibleBrand =
    showLogo !== false ? (brand ?? (legacy ? <PaymentProviderLogos brand="paypal" /> : null)) : null
  const descriptionText = description ?? (legacy ? (creditor ?? legacyDescription) : undefined)
  const recommendation: CheckoutSuggestion | undefined =
    typeof suggestion === "string"
      ? { label: suggestion }
      : (suggestion ?? (legacy ? { label: legacySuggestion } : undefined))

  return (
    <div className="@container w-full min-w-0">
      <section
        aria-label={busy ? heading : undefined}
        aria-labelledby={busy ? undefined : headingId}
        aria-busy={busy || undefined}
        data-slot="checkout-module"
        className={cn(
          "flex w-full flex-col gap-3 rounded-lg border border-border bg-card p-4 @lg:flex-row @lg:items-center @lg:gap-4",
          className,
        )}
        {...props}
      >
        {busy ? (
          <div data-slot="checkout-skeleton-layout" className="flex w-full flex-col gap-1 py-1.5">
            <div data-slot="checkout-skeleton" className="flex w-full flex-col gap-1">
              <Skeleton
                data-slot="checkout-skeleton-title"
                className="h-6 w-60 max-w-full rounded-4 bg-muted motion-safe:animate-none"
              />
              <Skeleton
                data-slot="checkout-skeleton-description"
                className="h-4 w-89 max-w-full rounded-4 bg-muted motion-safe:animate-none"
              />
              <Skeleton
                data-slot="checkout-skeleton-recommendation"
                className="h-4 w-42 max-w-full rounded-4 bg-muted motion-safe:animate-none"
              />
            </div>
          </div>
        ) : (
          <>
            <div
              data-slot="checkout-content"
              className={cn("flex min-w-0 flex-1 items-center", Boolean(visibleBrand) && "gap-3")}
            >
              {visibleBrand ? (
                <span data-slot="checkout-brand" className="inline-flex shrink-0">
                  {visibleBrand}
                </span>
              ) : null}
              <div
                data-slot="checkout-main"
                className="flex min-w-0 flex-1 flex-col gap-2 @lg:flex-row @lg:items-center @lg:gap-4"
              >
                <div data-slot="checkout-body" className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <Heading as={titleAs} id={headingId} className="break-words text-body-sb">
                      {heading}
                    </Heading>
                    {showDescription && descriptionText ? (
                      <p
                        data-slot="checkout-description"
                        className="break-words text-label-mini text-muted-foreground"
                      >
                        {descriptionText}
                      </p>
                    ) : null}
                  </div>
                  {showSuggestion && recommendation ? (
                    <p
                      data-slot="checkout-recommendation"
                      className="flex min-w-0 flex-wrap items-center gap-1 text-caption-sb text-han-purple"
                    >
                      <span
                        data-slot="checkout-recommendation-icon"
                        aria-hidden="true"
                        className="flex size-5 shrink-0 items-center justify-center"
                      >
                        {recommendation.icon ?? <PagoPAIcon name="emoji_objects" size={20} />}
                      </span>
                      <span data-slot="checkout-recommendation-text" className="break-words">
                        {recommendation.label}
                      </span>
                    </p>
                  ) : null}
                  {amount || noticeCode ? (
                    <dl data-slot="checkout-legacy-details" className="grid gap-3 @lg:grid-cols-2">
                      {amount ? (
                        <div>
                          <dt className="text-caption text-muted-foreground">Importo</dt>
                          <dd className="break-words text-title-xs">{amount}</dd>
                        </div>
                      ) : null}
                      {noticeCode ? (
                        <div>
                          <dt className="text-caption text-muted-foreground">{noticeCodeLabel}</dt>
                          <dd className="break-words text-body-sb">{noticeCode}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                </div>
                {visibleAction ? (
                  <div
                    data-slot="checkout-action"
                    className="ml-0 self-start @lg:ml-auto @lg:self-center"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={!action}
                      // Source action is a 16/22 text button: the visible line
                      // stays 22px, the >=44px target is the invisible ::after.
                      className="relative min-h-0 justify-start px-0 text-body-sb after:absolute after:inset-x-0 after:-inset-y-3"
                      onClick={action}
                    >
                      {actionName}
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export { CheckoutModule }
