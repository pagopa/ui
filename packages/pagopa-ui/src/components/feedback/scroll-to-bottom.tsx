import * as React from "react"
import { cn } from "@/lib/cn"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button } from "@/components/primitives/button"

function ScrollToBottom({
  target,
  label = "Vai in fondo",
  className,
}: {
  target?: React.RefObject<HTMLElement | null>
  label?: string
  className?: string
}) {
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
      type="button"
      size="icon"
      className={cn("size-14 rounded-full shadow-32", className)}
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
      <PagoPAIcon name="arrow" variant="down" decorative className="size-6" />
    </Button>
  )
}

export { ScrollToBottom }
