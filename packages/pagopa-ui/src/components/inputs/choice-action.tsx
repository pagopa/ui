"use client"

import * as React from "react"

export interface ChoiceAction {
  label: string
  onAction: () => void
  leading?: React.ReactNode
  disabled?: boolean
}

export function useChoiceAction(
  action?: ChoiceAction,
  focusTargetRef?: React.RefObject<HTMLElement | null>,
) {
  if (action && typeof action.onAction !== "function") {
    throw new Error("Choice action: onAction must be a function")
  }
  const actionsRef = React.useRef<{ close: () => void; unmount: () => void } | null>(null)
  const pending = React.useRef<(() => void) | null>(null)
  const [closeComplete, setCloseComplete] = React.useState(false)
  React.useEffect(() => {
    // The field removes Base UI's kept-mounted popup before this effect runs.
    if (!closeComplete || !pending.current) return
    const callback = pending.current
    pending.current = null
    try {
      callback()
    } catch (error) {
      // A throwing command surfaces as an uncaught error — the application's
      // reporting boundary owns it — instead of failing the React commit that
      // just closed the popup.
      queueMicrotask(() => {
        throw error
      })
    }
  }, [closeComplete])

  const onAction = () => {
    if (!action || !actionsRef.current) throw new Error("Choice action: popup is not available")
    pending.current = action.onAction
    actionsRef.current.close()
  }
  const onOpenChange = (open: boolean, details: { cancel: () => void; reason: string }) => {
    if (!open) {
      if (
        !pending.current &&
        details.reason === "focus-out" &&
        typeof document !== "undefined" &&
        focusTargetRef?.current === document.activeElement
      ) {
        details.cancel()
      }
      return
    }
    if (pending.current) {
      details.cancel()
      return
    }
    setCloseComplete(false)
  }
  const onOpenChangeComplete = (open: boolean) => {
    if (!open && pending.current) setCloseComplete(true)
  }

  return {
    rootProps: { actionsRef, onOpenChange, onOpenChangeComplete },
    onAction,
    closeComplete,
  }
}
