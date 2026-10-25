import * as React from "react"
import { cn } from "@/lib/cn"

// Shared shell of the application states (internal module, not re-exported by
// the family barrel).
/**
 * Shared content contract of the application states (Waiting/OK/KO/Empty).
 * Empty states reuse the same channels on their own surface.
 */
interface StateProps {
  /** Required heading of the state. */
  title: React.ReactNode
  /** Optional supporting copy. */
  description?: React.ReactNode
  /** Optional actions of the state. */
  actions?: React.ReactNode
  /** Optional extra slot (source KO code row). */
  extra?: React.ReactNode
  /** Heading level used to render `title`. @default "h2" */
  titleAs?: "h2" | "h3" | "h4"
  /** ClassName applied to the state's root section. */
  className?: string
}

/** Internally injected class hooks of the shared shell. */
interface StatePanelLayoutProps {
  contentClassName?: string
  messageClassName?: string
  titleClassName?: string
  actionsClassName?: string
}

function StatePanel({
  icon,
  title,
  description,
  actions,
  extra,
  titleAs: Title = "h2",
  className,
  contentClassName,
  messageClassName,
  titleClassName,
  actionsClassName,
}: StateProps & { icon: React.ReactNode } & StatePanelLayoutProps) {
  return (
    <section
      className={cn(
        "mx-auto flex max-w-xl flex-col items-center gap-6 bg-muted px-6 py-16 text-center",
        className,
      )}
    >
      <div className={cn("flex flex-col items-center gap-6", contentClassName)}>
        <div className="flex size-14 items-center justify-center">{icon}</div>
        <div className={cn("flex flex-col items-center gap-6", messageClassName)}>
          <Title className={cn("text-title-md-mobile tablet-md:text-title-md", titleClassName)}>
            {title}
          </Title>
          {description && <p className="text-body text-muted-foreground">{description}</p>}
        </div>
      </div>
      {extra}
      {actions && (
        <div className={cn("flex flex-wrap justify-center gap-2", actionsClassName)}>{actions}</div>
      )}
    </section>
  )
}

export { StatePanel, type StateProps }
