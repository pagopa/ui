import { PictogramFigure } from "@/components/icons/pictogram-figure"
import { cn } from "@/lib/cn"

import { StatePanel, type StateProps } from "./state-panel"
import { completed } from "pagopa-ui-artwork/pictograms/completed"

/**
 * Positive outcome: title, description and caller-owned native actions around
 * the Completed pictogram.
 *
 * Figma: OKState (node 733:22841)
 */
function SuccessState({ className, ref, ...props }: StateProps) {
  return (
    <StatePanel
      data-slot="success-state"
      {...props}
      ref={ref}
      actionsClassName="pui:flex-col pui:items-center pui:gap-6"
      className={cn("pui:w-full pui:max-w-none", className)}
      contentClassName="pui:w-full pui:max-w-none pui:tablet-md:max-w-(--pui-state-width)"
      icon={
        <div aria-hidden="true">
          <PictogramFigure
            asset={completed}
            background="light"
            className="pui:grid pui:size-14 pui:place-items-center"
            size={56}
          />
        </div>
      }
      messageClassName="pui:w-full pui:items-stretch pui:gap-2"
    />
  )
}

export { SuccessState }
