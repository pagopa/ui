import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"
import { cn } from "@/lib/cn"

import { StatePanel, type StateProps } from "./state-panel"

function WaitingState({ className, ref, ...props }: StateProps) {
  return (
    <StatePanel
      data-slot="waiting-state"
      {...props}
      ref={ref}
      actionsClassName="pui:mx-auto pui:w-full pui:max-w-(--pui-state-width) pui:flex-col pui:flex-nowrap pui:items-center pui:gap-6"
      className={cn("pui:w-full pui:max-w-none", className)}
      contentClassName="pui:w-full pui:max-w-none pui:tablet-md:max-w-(--pui-state-width)"
      icon={
        <div aria-hidden="true">
          <PagoPAPictogram
            background="light"
            className="pui:grid pui:size-14 pui:place-items-center"
            name="AlarmClock"
            size={56}
          />
        </div>
      }
      messageClassName="pui:w-full pui:items-stretch pui:gap-2"
      titleClassName="pui:mx-auto pui:max-w-none pui:tablet-md:max-w-xs"
    />
  )
}

export { WaitingState }
