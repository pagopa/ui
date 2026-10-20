import * as React from "react"

import { DialogTemplate } from "./DialogTemplate"

export interface SecurityCodeDialogProps {
  title: string
  description?: React.ReactNode
  /**
   * The code control. Pass the field with its own label
   * (`AuthenticationCodeInput`): the source's "Inserisci codice" row is an
   * external text line, while the library field owns its label — see the guide.
   */
  code: React.ReactNode
  /** Helper copy of the control; the source keeps a link inside it. */
  helper?: React.ReactNode
  actions?: React.ReactNode
  open?: boolean
  className?: string
}

// Source set `1909:99033` ("Security Code Dialog"), five device frames (320/600/
// 900/1200/1536 × 650). It is the shared dialog panel (see `DialogTemplate`)
// with a second panel-level block: the code control and its helper copy on the
// source 16px gap (the helper is three 14/20 lines on the narrow frame and one
// from 900 up). The source's alert row is a hidden instance in every variant, so
// the composition does not render it.
function SecurityCodeDialog({
  title,
  description,
  code,
  helper,
  actions,
  open = true,
  className,
}: SecurityCodeDialogProps) {
  return (
    <DialogTemplate
      title={title}
      description={description}
      open={open}
      className={className}
      blocks={
        <div data-slot="security-code-block" className="flex flex-col gap-4">
          {code}
          {helper ? <p className="text-label-mini text-muted-foreground">{helper}</p> : null}
        </div>
      }
      actions={actions}
    />
  )
}

export { SecurityCodeDialog }
