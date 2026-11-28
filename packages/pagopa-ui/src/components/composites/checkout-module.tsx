"use client"

import * as React from "react"
import { PaymentProviderLogos } from "@/components/content/payment-provider-logos"
import { Icon } from "@/components/icons/icon"
import { Default as EmojiObjectsIcon } from "@/components/icons/generated/emoji-objects"
import { Button } from "@/components/primitives/button"
import { Heading, type HeadingTag } from "@/components/primitives/heading"
import { Skeleton } from "@/components/primitives/skeleton"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

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
  /** Legacy label of the notice-code row. @default messages.checkoutModule.noticeCodeLabel */
  noticeCodeLabel?: string
  /** Legacy row title when `title` is omitted. @default messages.checkoutModule.legacyTitle */
  legacyTitle?: string
  /** Legacy supporting copy when neither `description` nor `creditor` is set. @default messages.checkoutModule.legacyDescription */
  legacyDescription?: string
  /** Legacy recommendation line in the compatibility composition. @default messages.checkoutModule.legacySuggestion */
  legacySuggestion?: string
  /** Action text of the legacy continue handler. @default messages.checkoutModule.continueLabel */
  continueLabel?: string
  /** Action text of the legacy edit handler. @default messages.checkoutModule.editLabel */
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
  legacyTitle: legacyTitleProp,
  legacyDescription: legacyDescriptionProp,
  legacySuggestion: legacySuggestionProp,
  noticeCodeLabel: noticeCodeLabelProp,
  continueLabel: continueLabelProp,
  editLabel: editLabelProp,
  className,
  ...props
}: CheckoutModuleProps) {
  const t = useMessages("checkoutModule")
  const legacyTitle = legacyTitleProp ?? t.legacyTitle
  const legacyDescription = legacyDescriptionProp ?? t.legacyDescription
  const legacySuggestion = legacySuggestionProp ?? t.legacySuggestion
  const noticeCodeLabel = noticeCodeLabelProp ?? t.noticeCodeLabel
  const continueLabel = continueLabelProp ?? t.continueLabel
  const editLabel = editLabelProp ?? t.editLabel

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
    <div className="pui:@container pui:w-full pui:min-w-0">
      <section
        aria-label={busy ? heading : undefined}
        aria-labelledby={busy ? undefined : headingId}
        aria-busy={busy || undefined}
        data-slot="checkout-module"
        className={cn(
          "pui:flex pui:w-full pui:flex-col pui:gap-3 pui:rounded-lg pui:border pui:border-border pui:bg-card pui:p-4 pui:@min-panel:flex-row pui:@min-panel:items-center pui:@min-panel:gap-4",
          className,
        )}
        {...props}
      >
        {busy ? (
          <div
            data-slot="checkout-skeleton-layout"
            className="pui:flex pui:w-full pui:flex-col pui:gap-1 pui:py-1.5"
          >
            <div
              data-slot="checkout-skeleton"
              className="pui:flex pui:w-full pui:flex-col pui:gap-1"
            >
              <Skeleton
                data-slot="checkout-skeleton-title"
                className="pui:h-6 pui:w-60 pui:max-w-full pui:rounded-4 pui:bg-muted pui:motion-safe:animate-none"
              />
              <Skeleton
                data-slot="checkout-skeleton-description"
                className="pui:h-4 pui:w-89 pui:max-w-full pui:rounded-4 pui:bg-muted pui:motion-safe:animate-none"
              />
              <Skeleton
                data-slot="checkout-skeleton-recommendation"
                className="pui:h-4 pui:w-42 pui:max-w-full pui:rounded-4 pui:bg-muted pui:motion-safe:animate-none"
              />
            </div>
          </div>
        ) : (
          <>
            <div
              data-slot="checkout-content"
              className={cn(
                "pui:flex pui:min-w-0 pui:flex-1 pui:items-center",
                Boolean(visibleBrand) && "pui:gap-3",
              )}
            >
              {visibleBrand ? (
                <span data-slot="checkout-brand" className="pui:inline-flex pui:shrink-0">
                  {visibleBrand}
                </span>
              ) : null}
              <div
                data-slot="checkout-main"
                className="pui:flex pui:min-w-0 pui:flex-1 pui:flex-col pui:gap-2 pui:@min-panel:flex-row pui:@min-panel:items-center pui:@min-panel:gap-4"
              >
                <div
                  data-slot="checkout-body"
                  className="pui:flex pui:min-w-0 pui:flex-1 pui:flex-col pui:gap-2"
                >
                  <div className="pui:flex pui:min-w-0 pui:flex-col pui:gap-0.5">
                    <Heading
                      as={titleAs}
                      id={headingId}
                      className="pui:break-words pui:text-body-sb"
                    >
                      {heading}
                    </Heading>
                    {showDescription && descriptionText ? (
                      <p
                        data-slot="checkout-description"
                        className="pui:break-words pui:text-label-mini pui:text-muted-foreground"
                      >
                        {descriptionText}
                      </p>
                    ) : null}
                  </div>
                  {showSuggestion && recommendation ? (
                    <p
                      data-slot="checkout-recommendation"
                      className="pui:flex pui:min-w-0 pui:flex-wrap pui:items-center pui:gap-1 pui:text-caption-sb pui:text-han-purple"
                    >
                      <span
                        data-slot="checkout-recommendation-icon"
                        aria-hidden="true"
                        className="pui:flex pui:size-5 pui:shrink-0 pui:items-center pui:justify-center"
                      >
                        {recommendation.icon ?? <Icon source={EmojiObjectsIcon} size={20} />}
                      </span>
                      <span data-slot="checkout-recommendation-text" className="pui:break-words">
                        {recommendation.label}
                      </span>
                    </p>
                  ) : null}
                  {amount || noticeCode ? (
                    <dl
                      data-slot="checkout-legacy-details"
                      className="pui:grid pui:gap-3 pui:@min-panel:grid-cols-2"
                    >
                      {amount ? (
                        <div>
                          <dt className="pui:text-caption pui:text-muted-foreground">Importo</dt>
                          <dd className="pui:break-words pui:text-title-xs">{amount}</dd>
                        </div>
                      ) : null}
                      {noticeCode ? (
                        <div>
                          <dt className="pui:text-caption pui:text-muted-foreground">
                            {noticeCodeLabel}
                          </dt>
                          <dd className="pui:break-words pui:text-body-sb">{noticeCode}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                </div>
                {visibleAction ? (
                  <div
                    data-slot="checkout-action"
                    className="pui:ml-0 pui:self-start pui:@min-panel:ml-auto pui:@min-panel:self-center"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={!action}
                      // Source action is a 16/22 text button: the visible line
                      // stays 22px, the >=44px target is the invisible ::after.
                      className="pui:relative pui:min-h-0 pui:justify-start pui:px-0 pui:text-body-sb pui:after:absolute pui:after:inset-x-0 pui:after:-inset-y-3"
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
export type { CheckoutModuleProps, CheckoutSuggestion }
