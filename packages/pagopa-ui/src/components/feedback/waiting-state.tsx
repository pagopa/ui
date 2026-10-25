import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"
import { cn } from "@/lib/cn"

import { StatePanel, type StateProps } from "./state-panel"

function WaitingState({ className, ...props }: StateProps) {
  return (
    <StatePanel
      {...props}
      actionsClassName="mx-auto w-full max-w-(--state-width) flex-col flex-nowrap items-center gap-6"
      className={cn("w-full max-w-none", className)}
      contentClassName="w-full max-w-none tablet-md:max-w-(--state-width)"
      icon={
        <div aria-hidden="true">
          <PagoPAPictogram
            background="light"
            className="grid size-14 place-items-center"
            name="AlarmClock"
            size={56}
          />
        </div>
      }
      messageClassName="w-full items-stretch gap-2"
      titleClassName="mx-auto max-w-none tablet-md:max-w-xs"
    />
  )
}

export { WaitingState }
