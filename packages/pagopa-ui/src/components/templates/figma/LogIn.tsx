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
        "flex flex-col items-center gap-10 px-6 py-16 tablet-md:px-10 tablet-md:py-20",
        className,
      )}
    >
      <div className="flex w-full flex-col gap-2 text-center tablet-md:max-w-(--login-width)">
        <h1 className="text-title-lg-mobile tablet-md:text-title-lg">{title}</h1>
        {/* The source description is 18/26 Regular; the file publishes only the
            18/26 Semibold variable (`Body/Body Big SB`), so the block takes its
            metrics and states the regular weight explicitly. */}
        {description ? (
          <p className="text-body-big-sb font-normal text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {alert ? <div className="w-full max-w-(--dialog-width-compact)">{alert}</div> : null}
      <div
        data-slot="login-module-actions"
        className="flex w-full max-w-(--dialog-width-compact) flex-col gap-6"
      >
        {actions}
      </div>
      {terms ? (
        <div
          data-slot="login-module-terms"
          className="flex w-full flex-col gap-4 text-center tablet-md:max-w-(--login-width)"
        >
          <Separator />
          <p className="text-body text-muted-foreground">{terms}</p>
        </div>
      ) : null}
    </div>
  )
}

export { LogIn }
