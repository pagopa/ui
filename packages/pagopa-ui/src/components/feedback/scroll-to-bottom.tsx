"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { Icon } from "@/components/icons/icon"
import { Down as ArrowDownIcon } from "@/components/icons/generated/arrow"
import { Button } from "@/components/primitives/button"

export interface ScrollToBottomProps extends Omit<React.ComponentProps<"button">, "children"> {
  target?: React.RefObject<HTMLElement | null>
  /** Accessible name of the scroll control. @default messages.scrollToBottom.label */
  label?: string
  className?: string
}

function ScrollToBottom({
  target,
  label: labelProp,
  className,
  ref,
  ...props
}: ScrollToBottomProps) {
  const t = useMessages("scrollToBottom")
  const label = labelProp ?? t.label

  const [visible, setVisible] = React.useState(true)
  React.useEffect(() => {
    const element = target?.current
    const source: Window | HTMLElement = element ?? window
    const update = () => {
      if (element) setVisible(element.scrollTop + element.clientHeight < element.scrollHeight - 8)
      else
        setVisible(window.scrollY + window.innerHeight < document.documentElement.scrollHeight - 8)
    }
    update()
    source.addEventListener("scroll", update, { passive: true })
    return () => source.removeEventListener("scroll", update)
  }, [target])
  if (!visible) return null
  return (
    <Button
      data-slot="scroll-to-bottom"
      {...props}
      ref={ref}
      type="button"
      size="icon"
      className={cn("pui:size-14 pui:rounded-full pui:shadow-32", className)}
      aria-label={label}
      onClick={() => {
        const element = target?.current
        const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth"
        if (element) element.scrollTo({ top: element.scrollHeight, behavior })
        else window.scrollTo({ top: document.documentElement.scrollHeight, behavior })
      }}
    >
      <Icon source={ArrowDownIcon} decorative className="pui:size-6" />
    </Button>
  )
}

export { ScrollToBottom }
