import * as React from "react"

import { Separator } from "@/components/primitives/separator"
import { cn } from "@/lib/cn"

export interface LogInProps {
  title: string
  description?: React.ReactNode
  /** Informative alert slot (source Alert with its own action). */
  alert?: React.ReactNode
  /** Identity-provider actions: the SPID and CIE buttons and the help line. */
  actions: React.ReactNode
  /** The terms note. */
  terms?: React.ReactNode
  className?: string
}

// Source set `2339:80916` ("Log In"), five device frames (320×2205 to
// 1536×1386): the application chrome around a centred login module. The module
// draws two compositions. Mobile/tablet (320×757, 600×647: pad 64/24, the
// 28/40 title): the text and terms blocks fill the frame and the 272px alert,
// action column and help line stay centred. Desktop (900×689, 1200×689: pad
// 80/40, the 36/50 title): the text and terms cap at the source 520 and the
// 40px block gap holds. The action column keeps the 24px gap (the SPID and CIE
// buttons, then the help line); the terms block is the divider, 16px, the 16/22
// note. Every block is centred.
function LogIn({ title, description, alert, actions, terms, className }: LogInProps) {
  return (
    <div
      data-slot="login-module"
      className={cn(
        "pui:flex pui:flex-col pui:items-center pui:gap-10 pui:px-6 pui:py-16 pui:tablet-md:px-10 pui:tablet-md:py-20",
        className,
      )}
    >
      <div
        data-slot="login-module-text"
        className="pui:flex pui:w-full pui:flex-col pui:gap-2 pui:text-center pui:tablet-md:max-w-(--pui-login-width)"
      >
        <h1
          data-slot="login-module-title"
          className="pui:text-title-lg-mobile pui:tablet-md:text-title-lg"
        >
          {title}
        </h1>
        {/* The source description is 18/26 Regular; the file publishes only the
            18/26 Semibold variable (`Body/Body Big SB`), so the block takes its
            metrics and states the regular weight explicitly. */}
        {description ? (
          <p
            data-slot="login-module-description"
            className="pui:text-body-big-sb pui:font-normal pui:text-muted-foreground"
          >
            {description}
          </p>
        ) : null}
      </div>
      {alert ? (
        <div className="pui:w-full pui:max-w-(--pui-dialog-width-compact)">{alert}</div>
      ) : null}
      <div
        data-slot="login-module-actions"
        className="pui:flex pui:w-full pui:max-w-(--pui-dialog-width-compact) pui:flex-col pui:gap-6"
      >
        {actions}
      </div>
      {terms ? (
        <div
          data-slot="login-module-terms"
          className="pui:flex pui:w-full pui:flex-col pui:gap-4 pui:text-center pui:tablet-md:max-w-(--pui-login-width)"
        >
          <Separator />
          <p
            data-slot="login-module-terms-text"
            className="pui:text-body pui:text-muted-foreground"
          >
            {terms}
          </p>
        </div>
      ) : null}
    </div>
  )
}

export { LogIn }
