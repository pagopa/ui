import { cn } from "@/lib/cn"

import { SpinnerIndicator } from "@/components/primitives/spinner-indicator"

/** Props of {@link Spinner}. */
interface SpinnerProps {
  /** Rendered size. @default "md" */
  size?: "sm" | "md" | "lg"
  /** Artwork variant for the surrounding surface. @default "primary" */
  variant?: "primary" | "contrast"
  /** Busy text announced to assistive tech; without it the spinner is decorative. */
  label?: string
  /** ClassName applied to the inline wrapper. */
  className?: string
}

function Spinner({ size = "md", variant = "primary", label, className }: SpinnerProps) {
  const statusLabel = label?.trim()
  return (
    <span
      data-slot="spinner"
      role={statusLabel ? "status" : undefined}
      aria-hidden={statusLabel ? undefined : true}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <SpinnerIndicator
        variant={variant}
        className={cn(size === "sm" && "size-5", size === "lg" && "size-12")}
      />
      {statusLabel ? <span className="sr-only">{statusLabel}</span> : null}
    </span>
  )
}

export { Spinner, type SpinnerProps }
