import {
  useCallback,
  useEffect,
  useEffectEvent,
  useReducer,
  useRef,
  type Ref,
  type RefObject,
} from "react"

function useInputRef(externalRef?: Ref<HTMLInputElement>) {
  const inputRef = useRef<HTMLInputElement>(null)
  const mergedInputRef = useCallback(
    (input: HTMLInputElement | null) => {
      inputRef.current = input
      if (typeof externalRef === "function") {
        const cleanup = externalRef(input)
        if (typeof cleanup === "function")
          return () => {
            inputRef.current = null
            cleanup()
          }
      } else if (externalRef) externalRef.current = input
    },
    [externalRef],
  )
  return { inputRef, mergedInputRef }
}

function useFormReset(
  controlRef: RefObject<{ form: HTMLFormElement | null } | null>,
  reset?: () => void,
) {
  const onReset = useEffectEvent(() => reset?.())
  const [, render] = useReducer((revision: number) => revision + 1, 0)
  useEffect(() => {
    const form = controlRef.current?.form
    function handleReset(event: Event) {
      queueMicrotask(() => {
        if (!event.defaultPrevented) {
          onReset()
          // Native reset mutates inputs even when React's controlled value is unchanged.
          render()
        }
      })
    }
    form?.addEventListener("reset", handleReset)
    return () => form?.removeEventListener("reset", handleReset)
  })
}

export { useFormReset, useInputRef }
