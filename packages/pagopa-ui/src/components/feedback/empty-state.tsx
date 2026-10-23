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
        "flex flex-col items-center gap-4 rounded-lg border bg-background p-4 text-center",
        className,
      )}
    >
      <div className="flex w-full flex-col items-center gap-2">
        {icon ? (
          <span
            aria-hidden="true"
            data-slot="empty-state-icon"
            className="grid size-14 place-items-center"
          >
            {icon}
          </span>
        ) : null}
        <Title className="text-label-sb text-muted-soft">{title}</Title>
        {description && <p className="text-body-small text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap justify-center gap-2">{actions}</div>}
    </section>
  )
}

export { EmptyState }
