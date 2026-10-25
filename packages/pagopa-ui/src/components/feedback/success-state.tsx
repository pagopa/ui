import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"
import { cn } from "@/lib/cn"

import { StatePanel, type StateProps } from "./state-panel"

/**
 * Positive outcome: title, description and caller-owned native actions around
 * the Completed pictogram.
 *
 * Figma: OKState (node 733:22841)
 */
function SuccessState({ className, ...props }: StateProps) {
  return (
    <StatePanel
      {...props}
      actionsClassName="flex-col items-center gap-6"
      className={cn("w-full max-w-none", className)}
      contentClassName="w-full max-w-none tablet-md:max-w-(--state-width)"
      icon={
        <div aria-hidden="true">
          <PagoPAPictogram
            background="light"
            className="grid size-14 place-items-center"
            name="Completed"
            size={56}
          />
        </div>
      }
      messageClassName="w-full items-stretch gap-2"
    />
  )
}

export { SuccessState }
