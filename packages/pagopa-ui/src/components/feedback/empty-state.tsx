import type { ReactNode } from "react"

import { cn } from "@/lib/cn"

import type { StateProps } from "./state-panel"

function EmptyState({
  title,
  description,
  actions,
  icon,
  titleAs: Title = "h2",
  className,
}: Omit<StateProps, "extra"> & {
  /** Optional pictogram of the state. */
  icon?: ReactNode
}) {
  return (
    <section
      className={cn(
        "pui:flex pui:flex-col pui:items-center pui:gap-4 pui:rounded-lg pui:border pui:bg-background pui:p-4 pui:text-center",
        className,
      )}
    >
      <div className="pui:flex pui:w-full pui:flex-col pui:items-center pui:gap-2">
        {icon ? (
          <span
            aria-hidden="true"
            data-slot="empty-state-icon"
            className="pui:grid pui:size-14 pui:place-items-center"
          >
            {icon}
          </span>
        ) : null}
        <Title className="pui:text-label-sb pui:text-muted-soft">{title}</Title>
        {description && (
          <p className="pui:text-body-small pui:text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="pui:flex pui:flex-wrap pui:justify-center pui:gap-2">{actions}</div>
      )}
    </section>
  )
}

export { EmptyState }
