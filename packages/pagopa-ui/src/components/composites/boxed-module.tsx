import * as React from "react"
import { cn } from "@/lib/cn"

// Shared shell of the composite modules (internal module, not re-exported by
// the family barrel).
type BoxedModuleProps = React.ComponentProps<"section"> & {
  title: string
  description?: string
  icon?: React.ReactNode
  actions?: React.ReactNode
  titleAs?: "h2" | "h3" | "h4"
}

function BoxedModule({
  title,
  description,
  icon,
  actions,
  titleAs: Title = "h2",
  children,
  className,
  ...props
}: BoxedModuleProps) {
  return (
    <section
      data-slot="boxed-module"
      className={cn("pui:rounded-lg pui:border pui:bg-card pui:p-4", className)}
      {...props}
    >
      <header className="pui:flex pui:items-start pui:gap-3">
        {icon ? (
          <span className="pui:grid pui:size-10 pui:shrink-0 pui:place-items-center pui:rounded-lg pui:bg-accent pui:text-primary">
            {icon}
          </span>
        ) : null}
        <div className="pui:min-w-0 pui:flex-1">
          <Title className="pui:text-body-big-sb">{title}</Title>
          {description ? (
            <p className="pui:text-caption pui:text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </header>
      {children ? <div className="pui:mt-4">{children}</div> : null}
      {actions ? (
        <footer className="pui:mt-5 pui:flex pui:flex-wrap pui:justify-end pui:gap-2 pui:border-t pui:pt-4">
          {actions}
        </footer>
      ) : null}
    </section>
  )
}

export { BoxedModule, type BoxedModuleProps }
