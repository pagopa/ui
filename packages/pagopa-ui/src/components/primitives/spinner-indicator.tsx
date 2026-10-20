import { cn } from "@/lib/cn"

interface SpinnerIndicatorProps {
  className?: string
  dataSlot?: string
  variant?: "primary" | "contrast"
}

export function SpinnerIndicator({
  className,
  dataSlot = "spinner-indicator",
  variant = "primary",
}: SpinnerIndicatorProps) {
  return (
    <span
      data-slot={dataSlot}
      aria-hidden="true"
      className={cn(
        "pointer-events-none relative block size-6 shrink-0 animate-spin loading-spinner-motion text-primary forced-colors:forced-color-adjust-none forced-colors:text-[CanvasText]",
        variant === "contrast" && "text-contrast",
        className,
      )}
    >
      <span
        data-slot="spinner-ring"
        className="absolute inset-0 rounded-full [background-image:conic-gradient(from_195.255deg,currentColor_253.089deg,transparent_253.125deg,currentColor_360deg)] [mask-image:radial-gradient(farthest-side,transparent_calc(100%_-_var(--hairline)),black_0)]"
      />
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 24 24"
        className="absolute inset-0 size-full"
      >
        <path
          data-figma-node-id="5966:24996"
          transform="translate(21.909424 9.592346)"
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0.872153 0.00833044C1.4199 -0.0623378 1.92122 0.324409 1.99189 0.872153C2.05758 1.38134 2.09053 1.89422 2.09053 2.40763C2.09053 2.95992 1.64282 3.40763 1.09053 3.40763C0.538249 3.40763 0.0905332 2.95992 0.0905332 2.40763C0.0905332 1.97979 0.0630769 1.55239 0.00833025 1.12807C-0.062337 0.580322 0.324408 0.0789996 0.872153 0.00833044Z"
        />
      </svg>
    </span>
  )
}
