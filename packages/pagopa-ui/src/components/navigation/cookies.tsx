"use client"

import * as React from "react"

import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"
import { Default as CloseIcon } from "@/components/icons/generated/close"
import { Button } from "@/components/primitives/button"

export interface CookiesProps extends Omit<React.ComponentProps<"section">, "children"> {
  /** Title and copy of the bar. */
  children: React.ReactNode
  /** Fired by the accept-all action. */
  onAccept: () => void
  /** Fired by the reject-all action. */
  onReject: () => void
  /** Fired by the learn-more text action. */
  onLearnMore?: () => void
  /** Renders the close control when provided. */
  onDismiss?: () => void
  /** Accessible name of the close control. @default messages.cookies.closeLabel */
  closeLabel?: string
  /** Accessible name of the bar. @default messages.cookies.label */
  label?: string
  /** Text of the learn-more action. @default messages.cookies.learnMoreLabel */
  learnMoreLabel?: string
  /** Text of the reject-all action. @default messages.cookies.rejectLabel */
  rejectLabel?: string
  /** Text of the accept-all action. @default messages.cookies.acceptLabel */
  acceptLabel?: string
}

function Cookies({
  children,
  onAccept,
  onReject,
  onLearnMore,
  onDismiss,
  closeLabel: closeLabelProp,
  label: labelProp,
  learnMoreLabel: learnMoreLabelProp,
  rejectLabel: rejectLabelProp,
  acceptLabel: acceptLabelProp,
  className,
  ref,
  ...props
}: CookiesProps) {
  const t = useMessages("cookies")
  const closeLabel = closeLabelProp ?? t.closeLabel
  const label = labelProp ?? t.label
  const learnMoreLabel = learnMoreLabelProp ?? t.learnMoreLabel
  const rejectLabel = rejectLabelProp ?? t.rejectLabel
  const acceptLabel = acceptLabelProp ?? t.acceptLabel

  // Source `Device=Mobile` (1360:12856): the close sits beside the copy, the
  // three actions stack full width under it; the desktop row keeps the close
  // with the action block.
  const closeButton = onDismiss ? (
    <button
      data-slot="cookies"
      type="button"
      aria-label={closeLabel}
      onClick={onDismiss}
      className="pui:flex pui:size-11 pui:shrink-0 pui:items-center pui:justify-center pui:rounded-md pui:hover:bg-muted pui:focus-visible:outline-2 pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"
    >
      <CloseIcon />
    </button>
  ) : null

  return (
    <section
      data-slot="cookies"
      ref={ref}
      aria-label={label}
      className={cn(
        "pui:fixed pui:inset-x-3 pui:bottom-3 pui:z-50 pui:mx-auto pui:flex pui:max-w-4xl pui:flex-col pui:gap-8 pui:bg-background pui:p-6 pui:shadow-32 pui:desktop:flex-row pui:desktop:flex-nowrap pui:desktop:items-center",
        className,
      )}
      {...props}
    >
      <div className="pui:flex pui:min-w-0 pui:flex-1 pui:items-start pui:justify-between pui:gap-4 pui:tablet:gap-6 pui:desktop:items-center">
        <p className="pui:min-w-0 pui:flex-1 pui:text-label-mini pui:text-muted-foreground">
          {children}
        </p>
        {closeButton ? <span className="pui:desktop:hidden">{closeButton}</span> : null}
      </div>
      <div className="pui:flex pui:flex-col pui:gap-6 pui:max-tablet:w-full pui:tablet:flex-row pui:tablet:flex-wrap pui:tablet:items-center">
        {onLearnMore ? (
          <Button
            variant="ghost"
            // Source ghost action: an 89×22 text button with no padding inside
            // the 24px button block (1360:23890), centred on the mobile stack
            // (the source `Button block` aligns its children to the centre).
            // The 44px pointer target comes from the invisible ::after
            // expansion, not the visible box.
            className="pui:relative pui:min-h-0 pui:px-0 pui:py-0 pui:after:absolute pui:after:inset-x-0 pui:after:-inset-y-3 pui:max-tablet:self-center"
            onClick={onLearnMore}
          >
            {learnMoreLabel}
          </Button>
        ) : null}
        <Button className="pui:max-tablet:w-full" onClick={onReject}>
          {rejectLabel}
        </Button>
        <Button className="pui:max-tablet:w-full" onClick={onAccept}>
          {acceptLabel}
        </Button>
        {closeButton ? <span className="pui:hidden pui:desktop:block">{closeButton}</span> : null}
      </div>
    </section>
  )
}

export { Cookies }
