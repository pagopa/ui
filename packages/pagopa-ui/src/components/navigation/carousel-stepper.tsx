import * as React from "react"
import { cn } from "@/lib/cn"

function CarouselStepper({
  count,
  activeIndex,
  onChange,
  label = "Seleziona contenuto",
}: {
  count: number
  activeIndex: number
  onChange: (index: number) => void
  label?: string
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])
  const move = (index: number) => {
    const next = (index + count) % count
    onChange(next)
    refs.current[next]?.focus()
  }
  return (
    <div role="group" aria-label={label} className="flex items-center justify-center gap-2">
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          ref={(node) => {
            refs.current[index] = node
          }}
          type="button"
          aria-current={index === activeIndex ? "true" : undefined}
          aria-label={`Contenuto ${index + 1} di ${count}`}
          tabIndex={index === activeIndex ? 0 : -1}
          onClick={() => onChange(index)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault()
              move(index + 1)
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault()
              move(index - 1)
            }
            if (event.key === "Home") {
              event.preventDefault()
              move(0)
            }
            if (event.key === "End") {
              event.preventDefault()
              move(count - 1)
            }
          }}
          className="grid size-11 place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none rounded-full transition-[width,height,background-color] motion-reduce:transition-none",
              index === activeIndex
                ? "h-1 w-4 bg-primary"
                : "size-2 border border-input bg-background",
            )}
          />
        </button>
      ))}
    </div>
  )
}

export { CarouselStepper }
