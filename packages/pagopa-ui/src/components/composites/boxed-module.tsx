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
    <section className={cn("rounded-lg border bg-card p-4", className)} {...props}>
      <header className="flex items-start gap-3">
        {icon ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-primary">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <Title className="text-body-big-sb">{title}</Title>
          {description ? <p className="text-caption text-muted-foreground">{description}</p> : null}
        </div>
      </header>
      {children ? <div className="mt-4">{children}</div> : null}
      {actions ? (
        <footer className="mt-5 flex flex-wrap justify-end gap-2 border-t pt-4">{actions}</footer>
      ) : null}
    </section>
  )
}

export { BoxedModule, type BoxedModuleProps }
