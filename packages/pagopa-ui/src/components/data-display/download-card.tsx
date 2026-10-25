"use client"

import { Download, ImageIcon } from "@/components/primitives/icons"
import { Button, buttonVariants } from "@/components/primitives/button"
import { useLinkComponent } from "@/lib/ui-provider"

type DownloadCardProps = {
  fileName: string
  meta?: string
} & ({ href: string; onDownload?: never } | { href?: never; onDownload?: () => void })

function DownloadCard({ fileName, meta, href, onDownload }: DownloadCardProps) {
  const Link = useLinkComponent()
  if (href !== undefined && !href.trim()) {
    throw new TypeError("DownloadCard href must not be empty")
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border p-4">
      <ImageIcon aria-hidden="true" className="text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-sb">{fileName}</p>
        {meta ? <p className="text-caption text-muted-foreground">{meta}</p> : null}
      </div>
      {href !== undefined ? (
        <Link
          className={buttonVariants({ size: "icon", variant: "ghost" })}
          aria-label={`Scarica ${fileName}`}
          href={href}
          download={fileName}
        >
          <Download aria-hidden="true" />
        </Link>
      ) : onDownload ? (
        <Button size="icon" variant="ghost" aria-label={`Scarica ${fileName}`} onClick={onDownload}>
          <Download aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  )
}

export { DownloadCard }
