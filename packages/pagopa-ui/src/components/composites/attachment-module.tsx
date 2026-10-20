import * as React from "react"
import { cn } from "@/lib/cn"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button } from "@/components/primitives/button"

function AttachmentModule({
  title,
  description,
  status,
  onOpen,
  onDownload,
  downloadLabel = "Scarica",
  className,
  ...props
}: React.ComponentProps<"section"> & {
  /** File title; actionable when `onOpen` is set. */
  title: string
  description?: string
  /** Availability tag of the Unavailable state. */
  status?: React.ReactNode
  /** Available state: opens the attachment from the title. */
  onOpen?: () => void
  /** Download action of the attachment. */
  onDownload?: () => void
  /** Accessible name of the download action. @default "Scarica" */
  downloadLabel?: string
}) {
  return (
    <section
      className={cn("flex items-center gap-4 rounded-lg border bg-card p-4", className)}
      {...props}
    >
      <div className="grid min-w-0 flex-1 gap-2">
        {onOpen ? (
          <Button
            type="button"
            variant="link"
            className="h-auto justify-start p-0 text-body-sb"
            onClick={onOpen}
          >
            {title}
          </Button>
        ) : (
          <p className="text-body-sb">{title}</p>
        )}
        {description ? (
          <p className="text-label-mini text-muted-foreground">{description}</p>
        ) : null}
        {status ? <span className="w-fit">{status}</span> : null}
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
          className="relative size-6 p-0 after:absolute after:-inset-2.5"
        >
          <PagoPAIcon name="download" className="size-6" />
        </Button>
      ) : null}
    </section>
  )
}

export { AttachmentModule }
