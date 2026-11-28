"use client"

import * as React from "react"

import { Icon } from "@/components/icons/icon"
import { Default as DownloadIcon } from "@/components/icons/generated/download"
import { Default as PhotoIcon } from "@/components/icons/generated/photo"
import { Button, buttonVariants } from "@/components/primitives/button"
import { cn } from "@/lib/cn"
import { useLinkComponent, useMessages } from "@/lib/ui-provider"

type DownloadCardProps = Omit<React.ComponentProps<"div">, "children"> & {
  fileName: string
  meta?: string
  /** Announced text of the download action. @default messages.downloadCard.downloadLabel */
  downloadLabel?: (fileName: string) => string
} & ({ href: string; onDownload?: never } | { href?: never; onDownload?: () => void })

function DownloadCard({
  fileName,
  meta,
  downloadLabel: downloadLabelProp,
  href,
  onDownload,
  className,
  ref,
  ...props
}: DownloadCardProps) {
  const Link = useLinkComponent()
  const t = useMessages("downloadCard")
  const downloadLabel = (downloadLabelProp ?? t.downloadLabel)(fileName)
  if (href !== undefined && !href.trim()) {
    throw new TypeError("DownloadCard href must not be empty")
  }
  return (
    <div
      ref={ref}
      data-slot="download-card"
      className={cn(
        "pui:flex pui:items-center pui:gap-3 pui:rounded-xl pui:border pui:p-4",
        className,
      )}
      {...props}
    >
      <Icon source={PhotoIcon} className="pui:text-primary" />
      <div className="pui:min-w-0 pui:flex-1">
        <p className="pui:truncate pui:text-body-sb">{fileName}</p>
        {meta ? <p className="pui:text-caption pui:text-muted-foreground">{meta}</p> : null}
      </div>
      {href !== undefined ? (
        <Link
          className={buttonVariants({ size: "icon", variant: "ghost" })}
          aria-label={downloadLabel}
          href={href}
          download={fileName}
        >
          <Icon source={DownloadIcon} />
        </Link>
      ) : onDownload ? (
        <Button size="icon" variant="ghost" aria-label={downloadLabel} onClick={onDownload}>
          <Icon source={DownloadIcon} />
        </Button>
      ) : null}
    </div>
  )
}

export { DownloadCard }
export type { DownloadCardProps }
