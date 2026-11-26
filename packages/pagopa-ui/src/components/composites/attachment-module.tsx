"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button } from "@/components/primitives/button"

export type AttachmentModuleProps = React.ComponentProps<"section"> & {
  /** File title; actionable when `onOpen` is set. */
  title: string
  description?: string
  /** Availability tag of the Unavailable state. */
  status?: React.ReactNode
  /** Available state: opens the attachment from the title. */
  onOpen?: () => void
  /** Download action of the attachment. */
  onDownload?: () => void
  /** Accessible name of the download action. @default messages.attachmentModule.downloadLabel */
  downloadLabel?: string
}

function AttachmentModule({
  title,
  description,
  status,
  onOpen,
  onDownload,
  downloadLabel: downloadLabelProp,
  className,
  ...props
}: AttachmentModuleProps) {
  const t = useMessages("attachmentModule")
  const downloadLabel = downloadLabelProp ?? t.downloadLabel

  return (
    <section
      data-slot="attachment-module"
      className={cn(
        "pui:flex pui:items-center pui:gap-4 pui:rounded-lg pui:bg-card pui:p-4 pui:ring-1 pui:ring-border",
        className,
      )}
      {...props}
    >
      <div className="pui:grid pui:min-w-0 pui:flex-1 pui:gap-2">
        {onOpen ? (
          <Button
            type="button"
            variant="link"
            className="pui:relative pui:h-auto pui:min-h-0 pui:justify-start pui:border-0 pui:p-0 pui:text-left pui:text-body-sb pui:after:absolute pui:after:inset-x-0 pui:after:-inset-y-3"
            onClick={onOpen}
          >
            {title}
          </Button>
        ) : (
          <p className="pui:text-body-sb">{title}</p>
        )}
        {description ? (
          <p className="pui:text-label-mini pui:text-muted-foreground">{description}</p>
        ) : null}
        {status ? <span className="pui:w-fit">{status}</span> : null}
      </div>
      {onDownload ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label={downloadLabel}
          onClick={onDownload}
          // Source action is a bare 24px glyph: the visible box stays 24px and
          // the >=44px pointer target comes from the invisible ::after expansion.
          className="pui:relative pui:size-6 pui:p-0 pui:after:absolute pui:after:-inset-2.5"
        >
          <PagoPAIcon name="download" className="pui:size-6" />
        </Button>
      ) : null}
    </section>
  )
}

export { AttachmentModule }
