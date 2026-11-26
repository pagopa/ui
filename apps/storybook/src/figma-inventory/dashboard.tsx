import * as React from "react"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

import { cn } from "@/lib/cn"

import {
  alignmentOf,
  AREAS,
  areaCounts,
  filterRegistryItems,
  formatDate,
  formatNumber,
  inventoryMeta,
  registryItemById,
  registryItems,
  shortFingerprint,
  SORT_OPTIONS,
  sortRegistryItems,
  statusCounts,
  statusLabel,
  STATUSES,
  syncPercent,
  totals,
  unaccountedCount,
  type RegistryItem,
  type RegistryStatus,
  type SortKey,
} from "./model"

// ------------------------------------------------------------------- atoms

function FigmaMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 38 57"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0Z" fill="#1ABCFE" />
      <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0Z" fill="#0ACF83" />
      <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19Z" fill="#FF7262" />
      <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5Z" fill="#F24E1E" />
      <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5Z" fill="#A259FF" />
    </svg>
  )
}

const statusTone: Record<RegistryStatus, { badge: string; dot: string }> = {
  implemented: {
    badge: "pui:bg-emerald-50 pui:text-emerald-700 pui:ring-emerald-600/20",
    dot: "pui:bg-emerald-500",
  },
  pending: {
    badge: "pui:bg-sky-50 pui:text-sky-700 pui:ring-sky-600/20",
    dot: "pui:bg-sky-500",
  },
  mocked: {
    badge: "pui:bg-amber-50 pui:text-amber-700 pui:ring-amber-600/20",
    dot: "pui:bg-amber-500",
  },
  excluded: {
    badge: "pui:bg-slate-100 pui:text-slate-600 pui:ring-slate-500/20",
    dot: "pui:bg-slate-400",
  },
  unaccounted: {
    badge: "pui:bg-rose-50 pui:text-rose-700 pui:ring-rose-600/20",
    dot: "pui:bg-rose-500",
  },
}

function StatusBadge({
  status,
  label,
  className,
}: {
  status: RegistryStatus
  label?: string
  className?: string
}) {
  const tone = statusTone[status]
  return (
    <span
      className={cn(
        "pui:inline-flex pui:shrink-0 pui:items-center pui:gap-1.5 pui:rounded-full pui:px-2 pui:py-0.5 pui:text-[11px] pui:font-medium pui:whitespace-nowrap pui:ring-1 pui:ring-inset",
        tone.badge,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("pui:size-1.5 pui:rounded-full", tone.dot)} />
      {label ?? statusLabel(status)}
    </span>
  )
}

function AreaBadge({ area, className }: { area: string; className?: string }) {
  return (
    <span
      className={cn(
        "pui:inline-flex pui:shrink-0 pui:items-center pui:gap-1.5 pui:rounded-full pui:bg-slate-100 pui:px-2 pui:py-0.5 pui:text-[11px] pui:font-medium pui:whitespace-nowrap pui:text-slate-700 pui:ring-1 pui:ring-slate-500/20 pui:ring-inset",
        className,
      )}
    >
      <span aria-hidden="true" className="pui:size-1.5 pui:rounded-full pui:bg-slate-400" />
      {area}
    </span>
  )
}

function focusRing() {
  return "pui:focus-visible:outline-2 pui:focus-visible:outline-offset-2 pui:focus-visible:outline-indigo-600"
}

// -------------------------------------------------------------- copy action

function fallbackCopy(value: string) {
  const textarea = document.createElement("textarea")
  textarea.value = value
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.opacity = "0"
  document.body.append(textarea)
  textarea.select()
  try {
    document.execCommand("copy")
  } finally {
    textarea.remove()
  }
}

function CopyButton({
  value,
  label,
  compact = false,
  className,
}: {
  value: string
  label: string
  compact?: boolean
  className?: string
}) {
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  React.useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      fallbackCopy(value)
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1600)
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      className={cn(
        "pui:inline-flex pui:shrink-0 pui:items-center pui:justify-center pui:gap-1.5 pui:rounded-md pui:text-[11px] pui:font-medium pui:transition",
        "pui:text-slate-500 pui:hover:bg-slate-100 pui:hover:text-slate-800",
        compact ? "pui:size-6" : "pui:px-2 pui:py-1",
        focusRing(),
        className,
      )}
      title={copied ? "Copied" : "Copy"}
    >
      {copied ? (
        <PagoPAIcon name="check" aria-hidden="true" className="pui:size-3.5 pui:text-emerald-600" />
      ) : (
        <PagoPAIcon name="content_copy" aria-hidden="true" className="pui:size-3.5" />
      )}
      {compact ? null : <span>{copied ? "Copied" : "Copy"}</span>}
    </button>
  )
}

// ------------------------------------------------------------------ header

function ResyncControl() {
  const [open, setOpen] = React.useState(false)
  const wrapper = React.useRef<HTMLDivElement>(null)
  const trigger = React.useRef<HTMLButtonElement>(null)

  function close() {
    setOpen(false)
    trigger.current?.focus()
  }

  React.useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (
        wrapper.current &&
        event.target instanceof Node &&
        !wrapper.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const command = "pnpm nx run pagopa-ui-cli:figma:plan\npnpm nx run pagopa-ui-cli:figma:triage"

  return (
    <div ref={wrapper} className="pui:relative pui:min-w-0">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls="figma-resync-panel"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "pui:inline-flex pui:max-w-full pui:items-center pui:gap-1.5 pui:rounded-lg pui:bg-indigo-600 pui:px-3 pui:py-1.5 pui:text-center pui:text-xs pui:font-semibold pui:text-white pui:shadow-sm pui:transition pui:hover:bg-indigo-500 pui:active:bg-indigo-700",
          focusRing(),
        )}
      >
        <PagoPAIcon name="cached" aria-hidden="true" className="pui:size-3.5" />
        Re-sync Figma
      </button>
      {open ? (
        <div
          id="figma-resync-panel"
          className="pui:absolute pui:top-full pui:right-0 pui:z-50 pui:mt-2 pui:w-[min(23rem,calc(100vw-2rem))] pui:rounded-xl pui:border pui:border-slate-200 pui:bg-white pui:p-4 pui:text-left pui:shadow-xl"
        >
          <div className="pui:flex pui:items-start pui:justify-between pui:gap-3">
            <div>
              <p className="pui:text-sm pui:font-semibold pui:text-slate-900">
                Refresh the snapshot
              </p>
              <p className="pui:mt-1 pui:text-xs pui:leading-relaxed pui:text-slate-500">
                This page reads committed JSON. Refresh the inventory locally, review the delta,
                then reload. The commands need <code className="pui:font-mono">FIGMA_TOKEN</code>.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close sync panel"
              className={cn(
                "pui:-mt-1 pui:-mr-1 pui:inline-flex pui:size-6 pui:shrink-0 pui:items-center pui:justify-center pui:rounded-md pui:text-slate-500 pui:hover:bg-slate-100 pui:hover:text-slate-700",
                focusRing(),
              )}
            >
              <PagoPAIcon name="close" aria-hidden="true" className="pui:size-3.5" />
            </button>
          </div>
          <div className="pui:mt-3 pui:flex pui:items-start pui:gap-2 pui:rounded-lg pui:border pui:border-slate-200 pui:bg-slate-50 pui:p-2.5">
            <PagoPAIcon
              name="code"
              aria-hidden="true"
              className="pui:mt-0.5 pui:size-3.5 pui:shrink-0 pui:text-slate-500"
            />
            <code className="pui:min-w-0 pui:flex-1 pui:font-mono pui:text-[10.5px] pui:leading-relaxed pui:break-all pui:whitespace-pre-wrap pui:text-slate-700">
              {command}
            </code>
            <CopyButton value={command} label="sync command" compact />
          </div>
          <div className="pui:mt-3 pui:flex pui:items-center pui:justify-between">
            <a
              href={inventoryMeta.figmaUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "pui:inline-flex pui:items-center pui:gap-1 pui:text-[11px] pui:font-medium pui:text-indigo-600 pui:hover:text-indigo-700 pui:hover:underline",
                focusRing(),
              )}
            >
              Open the Figma file
              <PagoPAIcon name="open_in_new" aria-hidden="true" className="pui:size-3" />
            </a>
            <span className="pui:font-mono pui:text-[10px] pui:text-slate-500">
              {formatDate(inventoryMeta.syncedAt)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Header() {
  return (
    <header className="pui:sticky pui:top-0 pui:z-30 pui:border-b pui:border-slate-200 pui:bg-white/85 pui:backdrop-blur">
      <div className="pui:mx-auto pui:flex pui:max-w-[1400px] pui:flex-wrap pui:items-center pui:justify-between pui:gap-2 pui:px-4 pui:py-2.5 pui:tablet:px-6 pui:desktop:px-8">
        <div className="pui:flex pui:min-w-0 pui:items-center pui:gap-3">
          <span
            aria-hidden="true"
            className="pui:flex pui:size-8 pui:shrink-0 pui:items-center pui:justify-center pui:rounded-lg pui:text-white pui:shadow-sm"
            style={{ backgroundImage: "linear-gradient(135deg, #6366f1, #7c3aed)" }}
          >
            <PagoPAIcon name="dashboard" className="pui:size-4" />
          </span>
          <div className="pui:min-w-0 pui:leading-tight">
            <p className="pui:truncate pui:text-[13px] pui:font-semibold pui:text-slate-900">
              PagoPA UI
            </p>
            <p className="pui:truncate pui:text-[11px] pui:text-slate-500">
              <span className="pui:tablet:hidden">Figma inventory</span>
              <span className="pui:hidden pui:tablet:inline">Design system · Figma inventory</span>
            </p>
          </div>
        </div>
        <div className="pui:flex pui:min-w-0 pui:items-center pui:gap-2">
          <span className="pui:hidden pui:items-center pui:gap-1.5 pui:rounded-full pui:border pui:border-slate-200 pui:bg-slate-50 pui:px-2.5 pui:py-1 pui:text-[11px] pui:text-slate-600 pui:tablet:inline-flex">
            <span aria-hidden="true" className="pui:size-1.5 pui:rounded-full pui:bg-emerald-500" />
            Snapshot {formatDate(inventoryMeta.syncedAt)}
          </span>
          <ResyncControl />
        </div>
      </div>
    </header>
  )
}

// --------------------------------------------------------------------- KPIs

function ProgressBar({
  value,
  className,
  barClassName,
}: {
  value: number
  className?: string
  barClassName?: string
}) {
  return (
    <div
      className={cn("pui:h-1.5 pui:overflow-hidden pui:rounded-full pui:bg-slate-100", className)}
    >
      <div
        className={cn(
          "pui:h-full pui:rounded-full pui:bg-indigo-500 pui:transition-[width]",
          barClassName,
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

function KpiCard({
  label,
  value,
  detail,
  icon,
  iconClassName,
  children,
}: {
  label: string
  value: string
  detail: React.ReactNode
  icon: React.ReactNode
  iconClassName: string
  children?: React.ReactNode
}) {
  return (
    <div className="pui:rounded-2xl pui:border pui:border-slate-200 pui:bg-white pui:p-4 pui:shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="pui:flex pui:items-start pui:justify-between pui:gap-3">
        <p className="pui:text-[11px] pui:font-semibold pui:tracking-[0.14em] pui:text-slate-500 pui:uppercase">
          {label}
        </p>
        <span
          aria-hidden="true"
          className={cn(
            "pui:flex pui:size-7 pui:shrink-0 pui:items-center pui:justify-center pui:rounded-lg",
            iconClassName,
          )}
        >
          {icon}
        </span>
      </div>
      <p className="pui:mt-3 pui:text-2xl pui:font-semibold pui:tracking-tight pui:text-slate-900 pui:tabular-nums">
        {value}
      </p>
      <div className="pui:mt-1 pui:text-xs pui:leading-relaxed pui:text-slate-500">{detail}</div>
      {children}
    </div>
  )
}

function Kpis() {
  return (
    <div className="pui:mt-6 pui:grid pui:gap-3 pui:tablet:grid-cols-2 pui:desktop:grid-cols-4">
      <KpiCard
        label="Total components"
        value={formatNumber(totals.total)}
        detail={
          <>
            {formatNumber(totals.pages)} Figma pages · {formatNumber(AREAS.length)} areas
          </>
        }
        icon={<PagoPAIcon name="dashboard" className="pui:size-4" />}
        iconClassName="bg-indigo-50 text-indigo-600"
      />
      <KpiCard
        label="Sync coverage"
        value={`${syncPercent.toFixed(1)}%`}
        detail={
          <>
            {formatNumber(totals.implemented)} implemented · {formatNumber(totals.notShipped)} open
          </>
        }
        icon={<PagoPAIcon name="check_circle" className="pui:size-4" />}
        iconClassName="bg-emerald-50 text-emerald-600"
      >
        <ProgressBar value={syncPercent} className="pui:mt-3" barClassName="pui:bg-emerald-500" />
      </KpiCard>
      <KpiCard
        label="Not shipped"
        value={formatNumber(totals.notShipped)}
        detail={
          <>
            {formatNumber(totals.mocked)} mocked · {formatNumber(totals.pending)} pending
          </>
        }
        icon={<PagoPAIcon name="warning" className="pui:size-4" />}
        iconClassName="bg-amber-50 text-amber-600"
      />
      <KpiCard
        label="Active variants"
        value={formatNumber(totals.variants)}
        detail={
          <>
            {formatNumber(totals.sets)} component sets · {formatNumber(totals.deviceVariants)}{" "}
            declared device frames
          </>
        }
        icon={<PagoPAIcon name="troubleshoot" className="pui:size-4" />}
        iconClassName="bg-violet-50 text-violet-600"
      />
    </div>
  )
}

function HealthStrip() {
  return (
    <div className="pui:mt-3 pui:rounded-2xl pui:border pui:border-slate-200 pui:bg-white pui:px-4 pui:py-3 pui:shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {unaccountedCount > 0 ? (
        <p className="pui:flex pui:items-center pui:gap-2 pui:text-[11px] pui:text-amber-700">
          <PagoPAIcon name="warning" aria-hidden="true" className="pui:size-3.5 pui:shrink-0" />
          {unaccountedCount} published nodes have no registry entry yet.
        </p>
      ) : (
        <p className="pui:flex pui:items-center pui:gap-2 pui:text-[11px] pui:text-emerald-700">
          <PagoPAIcon
            name="check_circle"
            aria-hidden="true"
            className="pui:size-3.5 pui:shrink-0"
          />
          Every published node is covered by a registry entry or a page rule.
        </p>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ toolbar

function SearchField({
  value,
  onChange,
  inputRef,
}: {
  value: string
  onChange: (value: string) => void
  inputRef: React.RefObject<HTMLInputElement | null>
}) {
  const shortcut =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform)
      ? "⌘K"
      : "Ctrl K"

  return (
    <div className="pui:relative pui:w-full pui:min-w-0 pui:tablet:w-auto pui:tablet:flex-1">
      <label className="pui:sr-only" htmlFor="registry-search">
        Search components
      </label>
      <PagoPAIcon
        name="search"
        aria-hidden="true"
        className="pui:pointer-events-none pui:absolute pui:top-1/2 pui:left-3 pui:size-4 pui:-translate-y-1/2 pui:text-slate-500"
      />
      <input
        ref={inputRef}
        id="registry-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onChange("")
            event.currentTarget.blur()
          }
        }}
        placeholder="Search name, node or export…"
        autoComplete="off"
        spellCheck={false}
        aria-keyshortcuts="Meta+K Control+K"
        className={cn(
          "pui:h-9 pui:w-full pui:rounded-lg pui:border pui:border-slate-200 pui:bg-white pui:pr-16 pui:pl-9 pui:text-sm pui:text-slate-900 pui:shadow-[0_1px_1px_rgba(15,23,42,0.03)] pui:transition",
          "pui:placeholder:text-slate-600 pui:hover:border-slate-300 pui:focus:border-indigo-300 pui:focus:ring-4 pui:focus:ring-indigo-500/10 pui:focus:outline-none",
          "pui:[&::-webkit-search-cancel-button]:appearance-none pui:[&::-webkit-search-decoration]:appearance-none",
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("")
            inputRef.current?.focus()
          }}
          aria-label="Clear search"
          className={cn(
            "pui:absolute pui:top-1/2 pui:right-2 pui:inline-flex pui:size-6 pui:-translate-y-1/2 pui:items-center pui:justify-center pui:rounded-md pui:text-slate-500 pui:hover:bg-slate-100 pui:hover:text-slate-700",
            focusRing(),
          )}
        >
          <PagoPAIcon name="close" aria-hidden="true" className="pui:size-3.5" />
        </button>
      ) : (
        <span
          aria-hidden="true"
          className="pui:pointer-events-none pui:absolute pui:top-1/2 pui:right-2.5 pui:flex pui:-translate-y-1/2 pui:items-center pui:gap-1 pui:rounded pui:border pui:border-slate-200 pui:bg-slate-50 pui:px-1.5 pui:py-0.5 pui:font-sans pui:text-[10px] pui:font-medium pui:text-slate-500"
        >
          <PagoPAIcon name="keyboard_hide" className="pui:size-3" />
          {shortcut}
        </span>
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
  className,
  title,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
  title?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      title={title}
      className={cn(
        "pui:inline-flex pui:items-center pui:gap-1.5 pui:rounded-full pui:border pui:px-2.5 pui:py-1 pui:text-[11px] pui:font-medium pui:transition",
        active
          ? "pui:border-slate-900 pui:bg-slate-900 pui:text-white pui:shadow-sm"
          : "pui:border-slate-200 pui:bg-white pui:text-slate-600 pui:hover:border-slate-300 pui:hover:bg-slate-50 pui:hover:text-slate-900",
        focusRing(),
        className,
      )}
    >
      {children}
    </button>
  )
}

function CountPill({ value }: { value: number }) {
  return (
    <span className="pui:font-mono pui:text-[10px] pui:tabular-nums">{formatNumber(value)}</span>
  )
}

function areaOption(value: string) {
  return `${value} (${formatNumber(areaCounts[value] ?? 0)})`
}

function AreaField({
  value,
  onChange,
}: {
  value: string | "all"
  onChange: (value: string | "all") => void
}) {
  return (
    <div className="pui:relative pui:w-full pui:shrink-0 pui:desktop:w-56">
      <select
        aria-label="Filter by area"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pui:h-9 pui:w-full pui:appearance-none pui:rounded-lg pui:border pui:border-slate-200 pui:bg-white pui:pr-8 pui:pl-3 pui:text-[11px] pui:font-medium pui:text-slate-600 pui:transition pui:hover:border-slate-300 pui:focus:border-indigo-300 pui:focus:ring-4 pui:focus:ring-indigo-500/10 pui:focus:outline-none"
      >
        <option value="all">All areas</option>
        {AREAS.map((area) => (
          <option key={area} value={area}>
            {areaOption(area)}
          </option>
        ))}
      </select>
      <PagoPAIcon
        name="chevron"
        variant="down"
        aria-hidden="true"
        className="pui:pointer-events-none pui:absolute pui:top-1/2 pui:right-2.5 pui:size-3.5 pui:-translate-y-1/2 pui:text-slate-500"
      />
    </div>
  )
}

function StatusFilters({
  value,
  onChange,
}: {
  value: RegistryStatus | "all"
  onChange: (value: RegistryStatus | "all") => void
}) {
  return (
    <fieldset
      aria-label="Filter by status"
      className="pui:m-0 pui:flex pui:min-w-0 pui:flex-wrap pui:items-center pui:gap-1.5 pui:border-0 pui:p-0"
    >
      <span
        aria-hidden="true"
        className="pui:mr-1 pui:text-[10px] pui:font-semibold pui:tracking-[0.12em] pui:text-slate-500 pui:uppercase"
      >
        Status
      </span>
      <FilterChip active={value === "all"} onClick={() => onChange("all")}>
        All
        <CountPill value={totals.total} />
      </FilterChip>
      {STATUSES.map((status) => (
        <FilterChip
          key={status}
          active={value === status}
          onClick={() => onChange(value === status ? "all" : status)}
          className={
            value === status ? `${statusTone[status].badge} pui:ring-1 pui:ring-inset` : undefined
          }
        >
          <span
            aria-hidden="true"
            className={cn("pui:size-1.5 pui:rounded-full", statusTone[status].dot)}
          />
          {statusLabel(status)}
          <CountPill value={statusCounts[status]} />
        </FilterChip>
      ))}
    </fieldset>
  )
}

function ViewToggle({
  view,
  onChange,
}: {
  view: "grid" | "table"
  onChange: (view: "grid" | "table") => void
}) {
  return (
    <fieldset
      aria-label="View mode"
      className="pui:m-0 pui:inline-flex pui:min-w-0 pui:shrink-0 pui:items-center pui:gap-0.5 pui:rounded-lg pui:border pui:border-slate-200 pui:bg-slate-50 pui:p-0.5"
    >
      <button
        type="button"
        aria-pressed={view === "grid"}
        aria-label="Grid view"
        onClick={() => onChange("grid")}
        className={cn(
          "pui:inline-flex pui:items-center pui:gap-1.5 pui:rounded-md pui:px-2 pui:py-1 pui:text-[11px] pui:font-medium pui:transition",
          view === "grid"
            ? "pui:bg-white pui:text-slate-900 pui:shadow-sm"
            : "pui:text-slate-500 pui:hover:text-slate-800",
          focusRing(),
        )}
      >
        <PagoPAIcon name="dashboard" aria-hidden="true" className="pui:size-3.5" />
        <span className="pui:hidden pui:tablet:inline">Grid</span>
      </button>
      <button
        type="button"
        aria-pressed={view === "table"}
        aria-label="Table view"
        onClick={() => onChange("table")}
        className={cn(
          "pui:inline-flex pui:items-center pui:gap-1.5 pui:rounded-md pui:px-2 pui:py-1 pui:text-[11px] pui:font-medium pui:transition",
          view === "table"
            ? "pui:bg-white pui:text-slate-900 pui:shadow-sm"
            : "pui:text-slate-500 pui:hover:text-slate-800",
          focusRing(),
        )}
      >
        <PagoPAIcon name="table_chart" aria-hidden="true" className="pui:size-3.5" />
        <span className="pui:hidden pui:tablet:inline">Table</span>
      </button>
    </fieldset>
  )
}

function isSortKey(value: string): value is SortKey {
  return SORT_OPTIONS.some((option) => option.id === value)
}

function SortField({ value, onChange }: { value: SortKey; onChange: (value: SortKey) => void }) {
  return (
    <div className="pui:relative pui:ml-auto pui:shrink-0 pui:tablet:ml-0">
      <select
        aria-label="Sort components"
        value={value}
        onChange={(event) => {
          if (isSortKey(event.target.value)) onChange(event.target.value)
        }}
        className={cn(
          "pui:h-9 pui:appearance-none pui:rounded-lg pui:border pui:border-slate-200 pui:bg-white pui:pr-8 pui:pl-3 pui:text-[11px] pui:font-medium pui:text-slate-600 pui:transition pui:hover:border-slate-300 pui:focus:border-indigo-300 pui:focus:ring-4 pui:focus:ring-indigo-500/10 pui:focus:outline-none",
        )}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <PagoPAIcon
        name="chevron"
        variant="down"
        aria-hidden="true"
        className="pui:pointer-events-none pui:absolute pui:top-1/2 pui:right-2.5 pui:size-3.5 pui:-translate-y-1/2 pui:text-slate-500"
      />
    </div>
  )
}

// -------------------------------------------------------------- preview art

function hash(value: string) {
  let result = 0
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) % 2_147_483_647
  }
  return result
}

function PreviewArt({ item }: { item: RegistryItem }) {
  const seed = hash(item.nodeId)
  const width = 46 + (seed % 4) * 9
  // Decorative only: the shape is seeded by the node id, so the preview stays
  // stable without a category → illustration map to maintain.
  const shape = seed % 4

  if (shape === 0) {
    return (
      <div className="pui:grid pui:grid-cols-4 pui:gap-1.5">
        {Array.from({ length: 8 }, (_, index) => (
          <span
            key={index}
            className={cn(
              "pui:size-7 pui:rounded-md pui:border pui:shadow-[0_1px_1px_rgba(15,23,42,0.04)]",
              index === seed % 8
                ? "pui:border-indigo-200 pui:bg-indigo-100/80"
                : "pui:border-slate-200 pui:bg-white",
            )}
          />
        ))}
      </div>
    )
  }

  if (shape === 1) {
    return (
      <div className="pui:flex pui:w-full pui:flex-col pui:items-center pui:gap-2.5">
        <div
          className="pui:flex pui:h-9 pui:items-center pui:justify-center pui:gap-2 pui:rounded-full pui:border pui:border-indigo-200 pui:bg-white pui:shadow-sm"
          style={{ width: `${width}%` }}
        >
          <span aria-hidden="true" className="pui:size-2 pui:rounded-full pui:bg-indigo-400/80" />
          <span className="pui:h-1.5 pui:w-10 pui:rounded-full pui:bg-indigo-100" />
        </div>
        <span className="pui:h-1.5 pui:w-24 pui:rounded-full pui:bg-slate-200" />
      </div>
    )
  }

  if (shape === 2) {
    return (
      <div
        className="pui:rounded-xl pui:border pui:border-slate-200 pui:bg-white pui:p-3 pui:shadow-sm"
        style={{ width: `${Math.min(78, width + 12)}%` }}
      >
        <div className="pui:flex pui:items-center pui:gap-2">
          <span aria-hidden="true" className="pui:size-5 pui:rounded-md pui:bg-indigo-100" />
          <span className="pui:h-1.5 pui:w-16 pui:rounded-full pui:bg-slate-300" />
        </div>
        <div className="pui:mt-3 pui:space-y-1.5">
          <span className="pui:block pui:h-1.5 pui:w-full pui:rounded-full pui:bg-slate-100" />
          <span className="pui:block pui:h-1.5 pui:w-4/5 pui:rounded-full pui:bg-slate-100" />
        </div>
        <div className="pui:mt-3 pui:flex pui:items-center pui:justify-between">
          <span className="pui:h-1.5 pui:w-10 pui:rounded-full pui:bg-slate-200" />
          <span className="pui:h-5 pui:w-14 pui:rounded-full pui:bg-indigo-500/80" />
        </div>
      </div>
    )
  }

  return (
    <div
      className="pui:overflow-hidden pui:rounded-lg pui:border pui:border-slate-200 pui:bg-white pui:shadow-sm"
      style={{ width: `${Math.min(82, width + 14)}%` }}
    >
      <div className="pui:flex pui:items-center pui:gap-1 pui:border-b pui:border-slate-100 pui:bg-slate-50/80 pui:px-2.5 pui:py-1.5">
        <span aria-hidden="true" className="pui:size-1.5 pui:rounded-full pui:bg-slate-300" />
        <span aria-hidden="true" className="pui:size-1.5 pui:rounded-full pui:bg-slate-300" />
        <span aria-hidden="true" className="pui:size-1.5 pui:rounded-full pui:bg-slate-300" />
        <span className="pui:ml-2 pui:h-1.5 pui:w-16 pui:rounded-full pui:bg-slate-200" />
      </div>
      <div className="pui:grid pui:grid-cols-3 pui:gap-1.5 pui:p-2.5">
        <span className="pui:col-span-3 pui:h-6 pui:rounded-md pui:bg-indigo-500/10" />
        <span className="pui:h-9 pui:rounded-md pui:bg-slate-100" />
        <span className="pui:h-9 pui:rounded-md pui:bg-slate-100" />
        <span className="pui:h-9 pui:rounded-md pui:bg-indigo-100/70" />
      </div>
    </div>
  )
}

function ComponentPreview({ item }: { item: RegistryItem }) {
  return (
    <div
      aria-hidden="true"
      className="pui:relative pui:h-[132px] pui:overflow-hidden pui:border-b pui:border-slate-100 pui:bg-slate-50/70"
    >
      <div
        className="pui:absolute pui:inset-0 pui:opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.35) 1px, transparent 0)",
          backgroundSize: "14px 14px",
        }}
      />
      <div className="pui:absolute pui:inset-0 pui:flex pui:items-center pui:justify-center pui:p-5 pui:transition-transform pui:duration-300 pui:motion-safe:group-hover:scale-[1.03]">
        <PreviewArt item={item} />
      </div>
      <span className="pui:absolute pui:top-2.5 pui:left-2.5 pui:rounded-md pui:border pui:border-slate-200 pui:bg-white/90 pui:px-1.5 pui:py-0.5 pui:text-[10px] pui:font-medium pui:text-slate-500">
        {item.area}
      </span>
      {item.box ? (
        <span className="pui:absolute pui:right-2.5 pui:bottom-2.5 pui:rounded-md pui:border pui:border-slate-200 pui:bg-white/90 pui:px-1.5 pui:py-0.5 pui:font-mono pui:text-[10px] pui:text-slate-500">
          {item.box.width} × {item.box.height}
        </span>
      ) : null}
      <span className="pui:absolute pui:top-2.5 pui:right-2.5 pui:flex pui:size-6 pui:items-center pui:justify-center pui:rounded-full pui:border pui:border-slate-200 pui:bg-white pui:text-slate-500 pui:opacity-0 pui:shadow-sm pui:transition pui:group-hover:opacity-100 pui:group-focus-visible:opacity-100">
        <PagoPAIcon name="open_in_new" className="pui:size-3.5" />
      </span>
    </div>
  )
}

// ------------------------------------------------------------------- cards

function ExternalIconLink({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className={cn(
        "pui:inline-flex pui:size-7 pui:items-center pui:justify-center pui:rounded-md pui:text-slate-500 pui:transition pui:hover:bg-slate-100 pui:hover:text-slate-700",
        focusRing(),
      )}
    >
      {children}
    </a>
  )
}

function RegistryCard({ item, onInspect }: { item: RegistryItem; onInspect: () => void }) {
  const showDevices =
    (item.status === "implemented" || item.status === "pending") && item.devices.length > 0

  return (
    <article
      data-node-id={item.nodeId}
      className="group pui:relative pui:flex pui:flex-col pui:overflow-hidden pui:rounded-xl pui:border pui:border-slate-200 pui:bg-white pui:shadow-[0_1px_2px_rgba(15,23,42,0.04)] pui:transition pui:duration-200 pui:hover:-translate-y-0.5 pui:hover:border-indigo-200 pui:hover:shadow-lg pui:hover:shadow-indigo-500/5"
    >
      <button
        type="button"
        onClick={onInspect}
        aria-label={`Inspect ${item.name}`}
        className="pui:block pui:w-full pui:text-left pui:focus-visible:outline-2 pui:focus-visible:outline-offset-[-2px] pui:focus-visible:outline-indigo-600"
      >
        <ComponentPreview item={item} />
        <div className="pui:space-y-2 pui:px-4 pui:pt-3.5 pui:pb-3">
          <div className="pui:flex pui:items-start pui:justify-between pui:gap-2">
            <div className="pui:min-w-0">
              <p className="pui:truncate pui:text-[10px] pui:font-semibold pui:tracking-[0.12em] pui:text-slate-500 pui:uppercase">
                {item.pageLabel}
              </p>
              <span className="pui:mt-1 pui:block pui:truncate pui:text-[15px] pui:font-semibold pui:text-slate-900">
                {item.name}
              </span>
              <span className="pui:mt-0.5 pui:block pui:truncate pui:font-mono pui:text-[10.5px] pui:text-slate-500">
                {item.moduleFile ?? "Unmapped"} · {item.exportName ?? "No export"}
              </span>
            </div>
            <StatusBadge status={item.status} />
          </div>
          <div className="pui:flex pui:flex-wrap pui:items-center pui:gap-x-2 pui:gap-y-1 pui:text-[10.5px] pui:text-slate-500">
            <span className="pui:font-medium pui:text-slate-600 pui:tabular-nums">
              {formatNumber(item.variantCount)} variants
            </span>
            <span aria-hidden="true" className="pui:text-slate-300">
              ·
            </span>
            <span className="pui:font-mono">{item.nodeId}</span>
            {showDevices ? (
              <>
                <span aria-hidden="true" className="pui:text-slate-300">
                  ·
                </span>
                <span data-slot="device-frames">devices {item.devices.join(", ")}</span>
              </>
            ) : null}
          </div>
        </div>
      </button>
      <div className="pui:mt-auto pui:flex pui:items-center pui:justify-between pui:gap-2 pui:border-t pui:border-slate-100 pui:px-3 pui:py-2">
        <button
          type="button"
          onClick={onInspect}
          className={cn(
            "pui:inline-flex pui:items-center pui:gap-1 pui:rounded-md pui:px-2 pui:py-1 pui:text-[11px] pui:font-medium pui:text-indigo-600 pui:transition pui:hover:bg-indigo-50 pui:hover:text-indigo-700",
            focusRing(),
          )}
        >
          Inspect
          <PagoPAIcon name="arrow" aria-hidden="true" className="pui:size-3" />
        </button>
        <div className="pui:flex pui:items-center pui:gap-0.5">
          <ExternalIconLink href={item.figmaUrl} label={`${item.name} in Figma`}>
            <FigmaMark className="pui:h-3.5 pui:w-2.5" />
          </ExternalIconLink>
          {item.storyUrl ? (
            <a
              href={item.storyUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`${item.name} in Storybook`}
              title={`${item.name} in Storybook`}
              className={cn(
                "pui:inline-flex pui:size-7 pui:items-center pui:justify-center pui:rounded-md pui:text-slate-500 pui:transition pui:hover:bg-slate-100 pui:hover:text-slate-700",
                focusRing(),
              )}
            >
              <PagoPAIcon name="menu_book" aria-hidden="true" className="pui:size-3.5" />
            </a>
          ) : (
            <span
              title="No Storybook page mapped"
              className="pui:inline-flex pui:size-7 pui:items-center pui:justify-center pui:rounded-md pui:text-slate-300"
            >
              <PagoPAIcon name="menu_book" aria-hidden="true" className="pui:size-3.5" />
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

// ------------------------------------------------------------------- table

function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="pui:flex pui:items-baseline pui:justify-between pui:gap-3 pui:py-1.5">
      <dt className="pui:text-[11px] pui:text-slate-500">{label}</dt>
      <dd className="pui:text-right pui:text-[11px] pui:font-medium pui:text-slate-700">{value}</dd>
    </div>
  )
}

function RegistryTable({
  items,
  onInspect,
}: {
  items: RegistryItem[]
  onInspect: (item: RegistryItem) => void
}) {
  return (
    <div className="pui:overflow-x-auto">
      <table className="pui:w-full pui:min-w-[900px] pui:border-collapse pui:text-left">
        <caption className="pui:sr-only">Published components registry</caption>
        <thead>
          <tr className="pui:border-b pui:border-slate-200 pui:bg-slate-50/80 pui:text-[10px] pui:font-semibold pui:tracking-[0.12em] pui:text-slate-600 pui:uppercase">
            <th scope="col" className="pui:px-4 pui:py-2.5">
              Component
            </th>
            <th scope="col" className="pui:px-3 pui:py-2.5">
              Area
            </th>
            <th scope="col" className="pui:px-3 pui:py-2.5">
              Status
            </th>
            <th scope="col" className="pui:px-3 pui:py-2.5 pui:text-right">
              Variants
            </th>
            <th scope="col" className="pui:px-3 pui:py-2.5">
              Figma v
            </th>
            <th scope="col" className="pui:px-3 pui:py-2.5">
              Code v
            </th>
            <th scope="col" className="pui:px-3 pui:py-2.5">
              Devices
            </th>
            <th scope="col" className="pui:px-3 pui:py-2.5 pui:text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="pui:divide-y pui:divide-slate-100">
          {items.map((item) => (
            <tr
              key={item.id}
              data-node-id={item.nodeId}
              onClick={(event) => {
                if (event.target instanceof Element && event.target.closest("a,button")) return
                onInspect(item)
              }}
              className="group pui:transition pui:hover:bg-slate-50/80"
            >
              <td className="pui:px-4 pui:py-2.5">
                <button
                  type="button"
                  onClick={() => onInspect(item)}
                  className={cn(
                    "pui:block pui:max-w-[18rem] pui:truncate pui:rounded-sm pui:text-left pui:text-[12.5px] pui:font-medium pui:text-slate-900 pui:hover:text-indigo-700",
                    focusRing(),
                  )}
                >
                  {item.name}
                </button>
                <span className="pui:mt-0.5 pui:block pui:truncate pui:font-mono pui:text-[10px] pui:text-slate-500">
                  {item.moduleFile ?? item.pageLabel} · {item.nodeId}
                </span>
              </td>
              <td className="pui:px-3 pui:py-2.5">
                <AreaBadge area={item.area} />
              </td>
              <td className="pui:px-3 pui:py-2.5">
                <StatusBadge status={item.status} />
              </td>
              <td className="pui:px-3 pui:py-2.5 pui:text-right">
                <span className="pui:text-[12px] pui:font-medium pui:text-slate-700 pui:tabular-nums">
                  {formatNumber(item.variantCount)}
                </span>
                <span className="pui:mt-0.5 pui:block pui:text-[10px] pui:text-slate-500">
                  {item.variantAxes.length} axes
                </span>
              </td>
              <td className="pui:px-3 pui:py-2.5">
                <span
                  className="pui:rounded pui:bg-slate-100 pui:px-1.5 pui:py-0.5 pui:font-mono pui:text-[10px] pui:text-slate-600"
                  title={item.designFingerprint}
                >
                  {shortFingerprint(item.designFingerprint)}
                </span>
              </td>
              <td className="pui:px-3 pui:py-2.5">
                <span
                  className="pui:rounded pui:bg-slate-100 pui:px-1.5 pui:py-0.5 pui:font-mono pui:text-[10px] pui:text-slate-600"
                  title={item.contractFingerprint}
                >
                  {shortFingerprint(item.contractFingerprint)}
                </span>
              </td>
              <td className="pui:px-3 pui:py-2.5">
                {item.devices.length ? (
                  <span
                    className="pui:block pui:max-w-[9rem] pui:truncate pui:font-mono pui:text-[10.5px] pui:text-slate-600"
                    title={item.devices.join(", ")}
                  >
                    {item.devices.join(", ")}
                  </span>
                ) : (
                  <span className="pui:text-[11px] pui:text-slate-300">—</span>
                )}
              </td>
              <td className="pui:px-3 pui:py-2.5">
                <div className="pui:flex pui:items-center pui:justify-end pui:gap-0.5">
                  <button
                    type="button"
                    onClick={() => onInspect(item)}
                    aria-label={`Inspect ${item.name}`}
                    title="Inspect"
                    className={cn(
                      "pui:inline-flex pui:size-7 pui:items-center pui:justify-center pui:rounded-md pui:text-slate-500 pui:transition pui:hover:bg-indigo-50 pui:hover:text-indigo-600",
                      focusRing(),
                    )}
                  >
                    <PagoPAIcon name="troubleshoot" aria-hidden="true" className="pui:size-3.5" />
                  </button>
                  <ExternalIconLink href={item.figmaUrl} label={`${item.name} in Figma`}>
                    <FigmaMark className="pui:h-3.5 pui:w-2.5" />
                  </ExternalIconLink>
                  {item.storyUrl ? (
                    <ExternalIconLink href={item.storyUrl} label={`${item.name} in Storybook`}>
                      <PagoPAIcon name="menu_book" aria-hidden="true" className="pui:size-3.5" />
                    </ExternalIconLink>
                  ) : (
                    <span
                      title="No Storybook page mapped"
                      className="pui:inline-flex pui:size-7 pui:items-center pui:justify-center pui:rounded-md pui:text-slate-300"
                    >
                      <PagoPAIcon name="menu_book" aria-hidden="true" className="pui:size-3.5" />
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// -------------------------------------------------------------- pagination

function pageWindow(current: number, total: number) {
  const candidates = [...new Set([1, total, current - 1, current, current + 1])]
    .filter((page) => page >= 1 && page <= total)
    .sort((left, right) => left - right)
  const result: (number | "gap")[] = []
  for (const page of candidates) {
    const previous = result.at(-1)
    if (typeof previous === "number" && page - previous > 1) result.push("gap")
    result.push(page)
  }
  return result
}

function Pagination({
  page,
  totalPages,
  total,
  from,
  to,
  onChange,
}: {
  page: number
  totalPages: number
  total: number
  from: number
  to: number
  onChange: (page: number) => void
}) {
  return (
    <div className="pui:flex pui:flex-col pui:gap-3 pui:tablet:flex-row pui:tablet:items-center pui:tablet:justify-between">
      <p className="pui:text-[11px] pui:text-slate-500">
        Showing <span className="pui:font-medium pui:text-slate-700 pui:tabular-nums">{from}</span>–
        <span className="pui:font-medium pui:text-slate-700 pui:tabular-nums">{to}</span> of{" "}
        <span className="pui:font-medium pui:text-slate-700 pui:tabular-nums">
          {formatNumber(total)}
        </span>
      </p>
      <div className="pui:flex pui:items-center pui:gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className={cn(
            "pui:inline-flex pui:size-7 pui:items-center pui:justify-center pui:rounded-md pui:border pui:border-slate-200 pui:bg-white pui:text-slate-500 pui:transition pui:hover:bg-slate-50 pui:hover:text-slate-800 pui:disabled:cursor-not-allowed pui:disabled:opacity-40",
            focusRing(),
          )}
        >
          <PagoPAIcon name="chevron" variant="left" aria-hidden="true" className="pui:size-3.5" />
        </button>
        {pageWindow(page, totalPages).map((candidate, index) =>
          candidate === "gap" ? (
            <span
              key={`gap-${index}`}
              aria-hidden="true"
              className="pui:px-1 pui:text-[11px] pui:text-slate-500"
            >
              …
            </span>
          ) : (
            <button
              key={candidate}
              type="button"
              onClick={() => onChange(candidate)}
              aria-label={`Page ${candidate}`}
              aria-current={candidate === page ? "page" : undefined}
              className={cn(
                "pui:inline-flex pui:size-7 pui:items-center pui:justify-center pui:rounded-md pui:border pui:text-[11px] pui:font-medium pui:tabular-nums pui:transition",
                candidate === page
                  ? "pui:border-indigo-600 pui:bg-indigo-600 pui:text-white"
                  : "pui:border-slate-200 pui:bg-white pui:text-slate-600 pui:hover:bg-slate-50 pui:hover:text-slate-900",
                focusRing(),
              )}
            >
              {candidate}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className={cn(
            "pui:inline-flex pui:size-7 pui:items-center pui:justify-center pui:rounded-md pui:border pui:border-slate-200 pui:bg-white pui:text-slate-500 pui:transition pui:hover:bg-slate-50 pui:hover:text-slate-800 pui:disabled:cursor-not-allowed pui:disabled:opacity-40",
            focusRing(),
          )}
        >
          <PagoPAIcon name="chevron" aria-hidden="true" className="pui:size-3.5" />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- inspector

type InspectorTab = "overview" | "diff" | "handoff"

const INSPECTOR_TABS: {
  id: InspectorTab
  label: string
  shortLabel: string
  icon: React.ReactNode
}[] = [
  {
    id: "overview",
    label: "Overview",
    shortLabel: "Overview",
    icon: <PagoPAIcon name="troubleshoot" className="pui:size-3.5" />,
  },
  {
    id: "diff",
    label: "Version diff",
    shortLabel: "Version diff",
    icon: <PagoPAIcon name="code" className="pui:size-3.5" />,
  },
  {
    id: "handoff",
    label: "Handoff & links",
    shortLabel: "Handoff",
    icon: <PagoPAIcon name="open_in_new" className="pui:size-3.5" />,
  },
]

function OverviewPanel({ item }: { item: RegistryItem }) {
  return (
    <div className="pui:space-y-6">
      <section aria-labelledby="inspector-facts">
        <h3
          id="inspector-facts"
          className="pui:text-[10px] pui:font-semibold pui:tracking-[0.14em] pui:text-slate-500 pui:uppercase"
        >
          Registry facts
        </h3>
        <dl className="pui:mt-2 pui:divide-y pui:divide-slate-100 pui:rounded-xl pui:border pui:border-slate-200 pui:bg-white pui:px-3">
          <KeyValue label="Figma page" value={item.pageLabel} />
          <KeyValue label="Area" value={item.area} />
          <KeyValue
            label="Variants"
            value={`${formatNumber(item.variantCount)} records · ${item.variantAxes.length} axes`}
          />
          <KeyValue
            label="Device axis"
            value={item.devices.length ? item.devices.join(", ") : "None declared"}
          />
          <KeyValue
            label="Dependencies"
            value={`${item.dependencies}${item.externalDependencies ? ` · ${item.externalDependencies} external` : ""}`}
          />
          <KeyValue
            label="Registry coverage"
            value={item.entry ? "Direct entry" : item.rule ? "Page rule" : "Unmapped"}
          />
        </dl>
      </section>

      <section aria-labelledby="inspector-axes">
        <div className="pui:flex pui:items-baseline pui:justify-between pui:gap-3">
          <h3
            id="inspector-axes"
            className="pui:text-[10px] pui:font-semibold pui:tracking-[0.14em] pui:text-slate-500 pui:uppercase"
          >
            Variant axes
          </h3>
          <span className="pui:text-[10px] pui:text-slate-500">
            {item.variantAxes.length} total
          </span>
        </div>
        {item.variantAxes.length ? (
          <div className="pui:mt-2 pui:space-y-2">
            {item.variantAxes.map((axis) => (
              <div
                key={axis.name}
                className="pui:rounded-lg pui:border pui:border-slate-200 pui:bg-white pui:px-3 pui:py-2.5"
              >
                <div className="pui:flex pui:items-center pui:justify-between pui:gap-2">
                  <p className="pui:text-[11px] pui:font-medium pui:text-slate-700">{axis.name}</p>
                  <span className="pui:font-mono pui:text-[9.5px] pui:text-slate-500">
                    {axis.type}
                  </span>
                </div>
                <div className="pui:mt-2 pui:flex pui:flex-wrap pui:gap-1">
                  {axis.options.map((option) => (
                    <span
                      key={option}
                      className={cn(
                        "pui:rounded pui:px-1.5 pui:py-0.5 pui:font-mono pui:text-[9.5px] pui:ring-1 pui:ring-inset",
                        option === axis.defaultValue
                          ? "pui:bg-indigo-50 pui:text-indigo-700 pui:ring-indigo-600/20"
                          : "pui:bg-slate-50 pui:text-slate-500 pui:ring-slate-200",
                      )}
                      title={option === axis.defaultValue ? "Default value" : undefined}
                    >
                      {option}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="pui:mt-2 pui:rounded-lg pui:border pui:border-dashed pui:border-slate-200 pui:px-3 pui:py-3 pui:text-[11px] pui:text-slate-500">
            This source has no variant axis.
          </p>
        )}
      </section>

      {item.note ? (
        <details className="group pui:rounded-xl pui:border pui:border-slate-200 pui:bg-white pui:px-3 pui:py-2.5">
          <summary className="pui:cursor-pointer pui:list-none pui:text-[11px] pui:font-medium pui:text-slate-700 pui:focus-visible:outline-2 pui:focus-visible:outline-offset-2 pui:focus-visible:outline-indigo-600">
            <span className="pui:inline-flex pui:items-center pui:gap-1.5">
              <PagoPAIcon
                name="chevron"
                aria-hidden="true"
                className="pui:size-3.5 pui:text-slate-500 pui:transition pui:group-open:rotate-90"
              />
              Registry note
            </span>
          </summary>
          <p className="pui:mt-2 pui:border-t pui:border-slate-100 pui:pt-2 pui:text-[11px] pui:leading-relaxed pui:whitespace-pre-line pui:text-slate-600">
            {item.note}
          </p>
        </details>
      ) : null}
    </div>
  )
}

function VersionCard({
  eyebrow,
  icon,
  title,
  fingerprint,
  rows,
}: {
  eyebrow: string
  icon: React.ReactNode
  title: string
  fingerprint: string
  rows: { label: string; value: React.ReactNode }[]
}) {
  return (
    <div className="pui:rounded-xl pui:border pui:border-slate-200 pui:bg-white pui:p-3.5">
      <div className="pui:flex pui:items-center pui:gap-2">
        <span
          aria-hidden="true"
          className="pui:flex pui:size-7 pui:items-center pui:justify-center pui:rounded-lg pui:bg-slate-100 pui:text-slate-600"
        >
          {icon}
        </span>
        <div className="pui:min-w-0">
          <p className="pui:text-[9.5px] pui:font-semibold pui:tracking-[0.12em] pui:text-slate-500 pui:uppercase">
            {eyebrow}
          </p>
          <p className="pui:truncate pui:text-[11px] pui:font-medium pui:text-slate-700">{title}</p>
        </div>
      </div>
      <div className="pui:mt-3 pui:flex pui:items-center pui:gap-1.5 pui:rounded-lg pui:bg-slate-50 pui:px-2 pui:py-1.5">
        <code className="pui:min-w-0 pui:flex-1 pui:truncate pui:font-mono pui:text-[10.5px] pui:text-slate-600">
          {fingerprint}
        </code>
        <CopyButton value={fingerprint} label={`${eyebrow} fingerprint`} compact />
      </div>
      <dl className="pui:mt-2 pui:divide-y pui:divide-slate-100">
        {rows.map((row) => (
          <KeyValue key={row.label} label={row.label} value={row.value} />
        ))}
      </dl>
    </div>
  )
}

function VersionPanel({ item }: { item: RegistryItem }) {
  const alignment = alignmentOf(item)

  return (
    <div className="pui:space-y-4">
      <div
        className={cn(
          "pui:flex pui:flex-wrap pui:items-center pui:gap-2 pui:rounded-xl pui:border pui:px-3 pui:py-2.5 pui:text-[11px]",
          alignment.id === "aligned"
            ? "pui:border-emerald-200 pui:bg-emerald-50 pui:text-emerald-700"
            : "pui:border-slate-200 pui:bg-slate-50 pui:text-slate-600",
        )}
      >
        {alignment.id === "aligned" ? (
          <PagoPAIcon
            name="check_circle"
            aria-hidden="true"
            className="pui:size-3.5 pui:shrink-0"
          />
        ) : (
          <PagoPAIcon name="warning" aria-hidden="true" className="pui:size-3.5 pui:shrink-0" />
        )}
        <span className="pui:font-medium">{alignment.label}</span>
        <span>
          {item.status === "implemented"
            ? "Canvas and contract are both recorded for this node."
            : "The registry record explains why this node is not compared as shipped."}
        </span>
      </div>

      <div className="pui:grid pui:gap-2 pui:tablet:grid-cols-2">
        <VersionCard
          eyebrow="Figma canvas"
          icon={<FigmaMark className="pui:h-3.5 pui:w-2.5" />}
          title={`${item.variantCount} variant records`}
          fingerprint={item.designFingerprint}
          rows={[
            { label: "Node", value: <span className="pui:font-mono">{item.nodeId}</span> },
            { label: "Type", value: item.type === "COMPONENT_SET" ? "Component set" : "Component" },
            {
              label: "Devices",
              value: item.devices.length ? item.devices.join(", ") : "None",
            },
          ]}
        />
        <VersionCard
          eyebrow="Code contract"
          icon={<PagoPAIcon name="code" className="pui:size-3.5" />}
          title={item.exportName ?? "No export mapped"}
          fingerprint={item.contractFingerprint}
          rows={[
            {
              label: "Module",
              value: <span className="pui:font-mono">{item.moduleFile ?? "Unmapped"}</span>,
            },
            {
              label: "Story exports",
              value: item.storyExports.length ? item.storyExports.length : "—",
            },
          ]}
        />
      </div>
    </div>
  )
}

function Snippet({ label, code, copyLabel }: { label: string; code: string; copyLabel: string }) {
  return (
    <div className="pui:rounded-xl pui:border pui:border-slate-200 pui:bg-slate-900 pui:p-3">
      <div className="pui:flex pui:items-center pui:justify-between pui:gap-2">
        <p className="pui:text-[9.5px] pui:font-semibold pui:tracking-[0.12em] pui:text-slate-500 pui:uppercase">
          {label}
        </p>
        <CopyButton
          value={code}
          label={copyLabel}
          compact
          className="pui:text-slate-500 pui:hover:bg-white/10 pui:hover:text-white"
        />
      </div>
      <pre className="pui:mt-2 pui:overflow-x-auto pui:font-mono pui:text-[11px] pui:leading-relaxed pui:text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function HandoffPanel({ item }: { item: RegistryItem }) {
  const packageExport = item.module?.startsWith("src/") ?? false
  const importCode = item.exportName
    ? packageExport
      ? `import { ${item.exportName} } from "@pagopa/ui"`
      : `// Storybook template, not a public package export\n// ${item.module ?? ""}`
    : "// No public export mapped for this node"
  const usageCode = item.exportName ? `<${item.exportName} />` : "// See the registry note"

  return (
    <div className="pui:space-y-4">
      <section aria-labelledby="inspector-snippets">
        <h3
          id="inspector-snippets"
          className="pui:text-[10px] pui:font-semibold pui:tracking-[0.14em] pui:text-slate-500 pui:uppercase"
        >
          Copy-ready snippets
        </h3>
        <div className="pui:mt-2 pui:space-y-2">
          <Snippet label="Import" code={importCode} copyLabel="import snippet" />
          <Snippet label="Usage" code={usageCode} copyLabel="usage snippet" />
        </div>
        {!packageExport ? (
          <p className="pui:mt-2 pui:rounded-lg pui:border pui:border-dashed pui:border-slate-200 pui:px-3 pui:py-2 pui:text-[10.5px] pui:leading-relaxed pui:text-slate-500">
            This node maps to a Storybook template rather than a package entry: there is no
            <code className="pui:mx-1 pui:font-mono">@pagopa/ui</code> import to copy.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="inspector-links">
        <h3
          id="inspector-links"
          className="pui:text-[10px] pui:font-semibold pui:tracking-[0.14em] pui:text-slate-500 pui:uppercase"
        >
          Quick links
        </h3>
        <div className="pui:mt-2 pui:divide-y pui:divide-slate-100 pui:overflow-hidden pui:rounded-xl pui:border pui:border-slate-200 pui:bg-white">
          <a
            href={item.figmaUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "pui:flex pui:items-center pui:gap-2.5 pui:px-3 pui:py-2.5 pui:text-[11px] pui:text-slate-700 pui:transition pui:hover:bg-slate-50",
              focusRing(),
            )}
          >
            <FigmaMark className="pui:h-3.5 pui:w-2.5 pui:shrink-0" />
            <span className="pui:min-w-0 pui:flex-1">
              <span className="pui:block pui:font-medium">Open the Figma node</span>
              <span className="pui:block pui:truncate pui:font-mono pui:text-[10px] pui:text-slate-500">
                {item.nodeId}
              </span>
            </span>
            <PagoPAIcon
              name="open_in_new"
              aria-hidden="true"
              className="pui:size-3.5 pui:shrink-0 pui:text-slate-500"
            />
          </a>
          {item.storyUrl ? (
            <a
              href={item.storyUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "pui:flex pui:items-center pui:gap-2.5 pui:px-3 pui:py-2.5 pui:text-[11px] pui:text-slate-700 pui:transition pui:hover:bg-slate-50",
                focusRing(),
              )}
            >
              <PagoPAIcon
                name="menu_book"
                aria-hidden="true"
                className="pui:size-3.5 pui:shrink-0 pui:text-slate-500"
              />
              <span className="pui:min-w-0 pui:flex-1">
                <span className="pui:block pui:font-medium">Open the Storybook page</span>
                <span className="pui:block pui:truncate pui:text-[10px] pui:text-slate-500">
                  {item.storyTitle}
                </span>
              </span>
              <PagoPAIcon
                name="open_in_new"
                aria-hidden="true"
                className="pui:size-3.5 pui:shrink-0 pui:text-slate-500"
              />
            </a>
          ) : (
            <div className="pui:flex pui:items-center pui:gap-2.5 pui:px-3 pui:py-2.5 pui:text-[11px] pui:text-slate-500">
              <PagoPAIcon
                name="menu_book"
                aria-hidden="true"
                className="pui:size-3.5 pui:shrink-0"
              />
              <span className="pui:flex-1">No Storybook page mapped for this node.</span>
            </div>
          )}
          {item.sourceUrl ? (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "pui:flex pui:items-center pui:gap-2.5 pui:px-3 pui:py-2.5 pui:text-[11px] pui:text-slate-700 pui:transition pui:hover:bg-slate-50",
                focusRing(),
              )}
            >
              <PagoPAIcon
                name="code"
                aria-hidden="true"
                className="pui:size-3.5 pui:shrink-0 pui:text-slate-500"
              />
              <span className="pui:min-w-0 pui:flex-1">
                <span className="pui:block pui:font-medium">Read the implementation</span>
                <span className="pui:block pui:truncate pui:font-mono pui:text-[10px] pui:text-slate-500">
                  {item.module}
                </span>
              </span>
              <PagoPAIcon
                name="open_in_new"
                aria-hidden="true"
                className="pui:size-3.5 pui:shrink-0 pui:text-slate-500"
              />
            </a>
          ) : null}
        </div>
      </section>

      {item.storyExports.length ? (
        <section aria-labelledby="inspector-story-exports">
          <h3
            id="inspector-story-exports"
            className="pui:text-[10px] pui:font-semibold pui:tracking-[0.14em] pui:text-slate-500 pui:uppercase"
          >
            Story exports
          </h3>
          <div className="pui:mt-2 pui:flex pui:flex-wrap pui:gap-1">
            {item.storyExports.map((story) => (
              <span
                key={story}
                className="pui:rounded pui:bg-slate-100 pui:px-1.5 pui:py-0.5 pui:font-mono pui:text-[9.5px] pui:text-slate-600"
              >
                {story}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <p className="pui:rounded-xl pui:border pui:border-slate-200 pui:bg-slate-50 pui:px-3 pui:py-2.5 pui:text-[10.5px] pui:leading-relaxed pui:text-slate-500">
        The story is the source of truth for props and visual states. The registry maps the Figma
        node to its public export; the fingerprints prove both sides were captured.
      </p>
    </div>
  )
}

function InspectorFooter({ item }: { item: RegistryItem }) {
  return (
    <footer className="pui:flex pui:shrink-0 pui:items-center pui:gap-2 pui:border-t pui:border-slate-200 pui:bg-slate-50/70 pui:px-5 pui:py-3">
      <a
        href={item.figmaUrl}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "pui:inline-flex pui:flex-1 pui:items-center pui:justify-center pui:gap-1.5 pui:rounded-lg pui:bg-indigo-600 pui:px-3 pui:py-2 pui:text-[11px] pui:font-semibold pui:text-white pui:shadow-sm pui:transition pui:hover:bg-indigo-500 pui:active:bg-indigo-700",
          focusRing(),
        )}
      >
        <FigmaMark className="pui:h-3 pui:w-2.5" />
        Open in Figma
        <PagoPAIcon name="open_in_new" aria-hidden="true" className="pui:size-3" />
      </a>
      {item.storyUrl ? (
        <a
          href={item.storyUrl}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "pui:inline-flex pui:flex-1 pui:items-center pui:justify-center pui:gap-1.5 pui:rounded-lg pui:border pui:border-slate-200 pui:bg-white pui:px-3 pui:py-2 pui:text-[11px] pui:font-semibold pui:text-slate-700 pui:transition pui:hover:bg-slate-50 pui:hover:text-slate-900",
            focusRing(),
          )}
        >
          <PagoPAIcon name="menu_book" aria-hidden="true" className="pui:size-3.5" />
          Storybook
          <PagoPAIcon name="open_in_new" aria-hidden="true" className="pui:size-3" />
        </a>
      ) : (
        <span className="pui:inline-flex pui:flex-1 pui:items-center pui:justify-center pui:rounded-lg pui:border pui:border-dashed pui:border-slate-200 pui:px-3 pui:py-2 pui:text-[11px] pui:text-slate-500">
          No story mapped
        </span>
      )}
    </footer>
  )
}

function Inspector({ item, onClose }: { item: RegistryItem | null; onClose: () => void }) {
  const dialogRef = React.useRef<HTMLDialogElement>(null)
  const [tab, setTab] = React.useState<InspectorTab>("overview")
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([])

  React.useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (item && !dialog.open) dialog.showModal()
    else if (!item && dialog.open) dialog.close()
  }, [item])

  React.useEffect(() => {
    if (!item) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [item])

  // Resetting here, on the close path, keeps the next open on Overview without
  // an effect that would re-render the whole drawer for a tab reset.
  function handleClose() {
    setTab("overview")
    onClose()
  }

  function onTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = INSPECTOR_TABS.length - 1
    let next = index
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1
    else if (event.key === "Home") next = 0
    else if (event.key === "End") next = last
    else return
    event.preventDefault()
    setTab(INSPECTOR_TABS[next].id)
    tabRefs.current[next]?.focus()
  }

  return (
    <dialog
      ref={dialogRef}

      aria-modal="true"
      aria-labelledby="figma-inspector-title"
      onClose={handleClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current?.close()
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") dialogRef.current?.close()
      }}
      className="figma-inspector pui:fixed pui:inset-y-0 pui:right-0 pui:left-auto pui:m-0 pui:h-dvh pui:max-h-dvh pui:w-full pui:max-w-[34rem] pui:overflow-hidden pui:border-l pui:border-slate-200 pui:bg-white pui:p-0 pui:text-slate-900 pui:shadow-2xl"
    >
      <style>{`
        .figma-inspector::backdrop {
          background: rgb(15 23 42 / 0.35);
          backdrop-filter: blur(2px);
        }
        .figma-inspector[open] {
          animation: figma-inspector-enter 220ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .figma-inspector[open]::backdrop {
          animation: figma-backdrop-enter 220ms ease-out;
        }
        @keyframes figma-inspector-enter {
          from { transform: translateX(28px); }
          to { transform: translateX(0); }
        }
        @keyframes figma-backdrop-enter {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .figma-inspector[open], .figma-inspector[open]::backdrop { animation: none; }
        }
      `}</style>
      {item ? (
        <div className="pui:flex pui:h-full pui:min-h-0 pui:flex-col">
          <header className="pui:shrink-0 pui:border-b pui:border-slate-200 pui:bg-white pui:px-5 pui:pt-5">
            <div className="pui:flex pui:items-start pui:justify-between pui:gap-4">
              <div className="pui:min-w-0">
                <p className="pui:flex pui:flex-wrap pui:items-center pui:gap-1.5 pui:text-[10px] pui:font-semibold pui:tracking-[0.14em] pui:text-indigo-600 pui:uppercase">
                  <span>{item.area}</span>
                  <span aria-hidden="true" className="pui:text-slate-300">
                    /
                  </span>
                  <span className="pui:text-slate-500">{item.pageLabel}</span>
                </p>
                <h2
                  id="figma-inspector-title"
                  className="pui:mt-1.5 pui:pr-2 pui:text-xl pui:font-semibold pui:tracking-tight pui:break-words pui:text-slate-900"
                >
                  {item.name}
                </h2>
                <p className="pui:mt-1 pui:flex pui:flex-wrap pui:items-center pui:gap-1.5 pui:font-mono pui:text-[10.5px] pui:text-slate-500">
                  <span>{item.exportName ?? "No export"}</span>
                  <span aria-hidden="true" className="pui:text-slate-300">
                    ·
                  </span>
                  <span>{item.type === "COMPONENT_SET" ? "Component set" : "Component"}</span>
                  <span aria-hidden="true" className="pui:text-slate-300">
                    ·
                  </span>
                  <span>{item.nodeId}</span>
                </p>
                <div className="pui:mt-2.5 pui:flex pui:flex-wrap pui:items-center pui:gap-1.5">
                  <StatusBadge status={item.status} />
                  {item.devices.map((device) => (
                    <span
                      key={device}
                      className="pui:rounded-full pui:bg-slate-100 pui:px-2 pui:py-0.5 pui:font-mono pui:text-[10px] pui:text-slate-500"
                    >
                      {device}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label="Close inspector"
                className={cn(
                  "pui:inline-flex pui:size-7 pui:shrink-0 pui:items-center pui:justify-center pui:rounded-md pui:text-slate-500 pui:transition pui:hover:bg-slate-100 pui:hover:text-slate-700",
                  focusRing(),
                )}
              >
                <PagoPAIcon name="close" aria-hidden="true" className="pui:size-4" />
              </button>
            </div>
            <div
              role="tablist"
              aria-label="Component details"
              className="pui:mt-4 pui:flex pui:gap-1"
            >
              {INSPECTOR_TABS.map((candidate, index) => (
                <button
                  key={candidate.id}
                  ref={(node) => {
                    tabRefs.current[index] = node
                  }}
                  type="button"
                  role="tab"
                  id={`inspector-tab-${candidate.id}`}
                  aria-selected={tab === candidate.id}
                  aria-controls={`inspector-panel-${candidate.id}`}
                  tabIndex={tab === candidate.id ? 0 : -1}
                  onClick={() => setTab(candidate.id)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                  className={cn(
                    "pui:-mb-px pui:inline-flex pui:items-center pui:gap-1.5 pui:border-b-2 pui:px-2.5 pui:py-2 pui:text-[11px] pui:font-medium pui:transition",
                    tab === candidate.id
                      ? "pui:border-indigo-600 pui:text-indigo-700"
                      : "pui:border-transparent pui:text-slate-500 pui:hover:border-slate-300 pui:hover:text-slate-800",
                    focusRing(),
                  )}
                >
                  <span aria-hidden="true">{candidate.icon}</span>
                  <span className="pui:tablet:hidden">{candidate.shortLabel}</span>
                  <span className="pui:hidden pui:tablet:inline">{candidate.label}</span>
                </button>
              ))}
            </div>
          </header>

          <div
            id={`inspector-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`inspector-tab-${tab}`}
            tabIndex={0}
            className="pui:min-h-0 pui:flex-1 pui:overflow-y-auto pui:px-5 pui:py-5 pui:focus:outline-none"
          >
            {tab === "overview" ? <OverviewPanel item={item} /> : null}
            {tab === "diff" ? <VersionPanel item={item} /> : null}
            {tab === "handoff" ? <HandoffPanel item={item} /> : null}
          </div>

          <InspectorFooter item={item} />
        </div>
      ) : null}
    </dialog>
  )
}

// ------------------------------------------------------------------- empty

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="pui:flex pui:flex-col pui:items-center pui:justify-center pui:rounded-xl pui:border pui:border-dashed pui:border-slate-200 pui:bg-slate-50/50 pui:px-6 pui:py-16 pui:text-center">
      <span
        aria-hidden="true"
        className="pui:flex pui:size-11 pui:items-center pui:justify-center pui:rounded-full pui:bg-white pui:text-slate-500 pui:ring-1 pui:ring-slate-200"
      >
        <PagoPAIcon name="search" className="pui:size-5" />
      </span>
      <p className="pui:mt-3 pui:text-sm pui:font-medium pui:text-slate-800">No components match</p>
      <p className="pui:mt-1 pui:max-w-sm pui:text-xs pui:leading-relaxed pui:text-slate-500">
        Try a different term, or clear the filters to see the whole published inventory.
      </p>
      <button
        type="button"
        onClick={onClear}
        className={cn(
          "pui:mt-4 pui:inline-flex pui:items-center pui:gap-1.5 pui:rounded-lg pui:border pui:border-slate-200 pui:bg-white pui:px-3 pui:py-1.5 pui:text-[11px] pui:font-medium pui:text-slate-700 pui:transition pui:hover:bg-slate-50",
          focusRing(),
        )}
      >
        Clear filters
        <PagoPAIcon name="close" aria-hidden="true" className="pui:size-3" />
      </button>
    </div>
  )
}

// --------------------------------------------------------------- dashboard

function PageHero() {
  return (
    <section aria-labelledby="page-title">
      <div className="pui:flex pui:flex-wrap pui:items-start pui:justify-between pui:gap-5">
        <div className="pui:min-w-0 pui:max-w-2xl">
          <p className="pui:inline-flex pui:items-center pui:gap-1.5 pui:rounded-full pui:border pui:border-indigo-200 pui:bg-indigo-50 pui:px-2.5 pui:py-1 pui:text-[10px] pui:font-semibold pui:tracking-[0.12em] pui:text-indigo-700 pui:uppercase">
            <span aria-hidden="true" className="pui:size-1.5 pui:rounded-full pui:bg-indigo-500" />
            Design system · Inventory
          </p>
          <h1
            id="page-title"
            className="pui:mt-3 pui:text-3xl pui:font-semibold pui:tracking-tight pui:break-words pui:text-slate-900 pui:tablet:text-4xl"
          >
            Published components
          </h1>
          <p className="pui:mt-2 pui:max-w-xl pui:text-sm pui:leading-relaxed pui:text-slate-500">
            Every published Figma node, its registry status, the variant matrix and the code
            contract that ships it. Built for the people who ship the code.
          </p>
        </div>
        <div className="pui:flex pui:min-w-0 pui:flex-wrap pui:items-center pui:gap-1.5 pui:text-[11px]">
          <span className="pui:inline-flex pui:items-center pui:gap-1.5 pui:rounded-full pui:border pui:border-slate-200 pui:bg-white pui:px-2.5 pui:py-1 pui:text-slate-600">
            <PagoPAIcon
              name="cached"
              aria-hidden="true"
              className="pui:size-3 pui:text-slate-500"
            />
            Snapshot {formatDate(inventoryMeta.syncedAt)}
          </span>
          <span className="pui:inline-flex pui:items-center pui:gap-1.5 pui:rounded-full pui:border pui:border-slate-200 pui:bg-white pui:px-2.5 pui:py-1 pui:text-slate-600">
            <PagoPAIcon
              name="dashboard"
              aria-hidden="true"
              className="pui:size-3 pui:text-slate-500"
            />
            {formatNumber(totals.pages)} pages
          </span>
          <span className="pui:inline-flex pui:items-center pui:gap-1.5 pui:rounded-full pui:border pui:border-slate-200 pui:bg-white pui:px-2.5 pui:py-1 pui:text-slate-600">
            <span aria-hidden="true" className="pui:size-1.5 pui:rounded-full pui:bg-slate-300" />
            File{" "}
            <span className="pui:font-mono pui:text-[10px]">
              {inventoryMeta.fileKey.slice(0, 7)}…
            </span>
          </span>
        </div>
      </div>

      <Kpis />
      <HealthStrip />
    </section>
  )
}

function PageFooter() {
  return (
    <footer className="pui:mt-8 pui:flex pui:flex-col pui:gap-3 pui:border-t pui:border-slate-200 pui:pt-5 pui:text-[11px] pui:text-slate-500 pui:tablet:flex-row pui:tablet:items-center pui:tablet:justify-between">
      <p className="pui:max-w-xl pui:leading-relaxed">
        Snapshot generated from the Figma REST API on{" "}
        <span className="pui:font-medium pui:text-slate-700">
          {formatDate(inventoryMeta.syncedAt)}
        </span>
        . This page reads committed JSON; it never calls Figma at runtime.
      </p>
      <div className="pui:flex pui:flex-wrap pui:items-center pui:gap-3">
        <a
          href={inventoryMeta.figmaUrl}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "pui:inline-flex pui:items-center pui:gap-1 pui:rounded-sm pui:font-medium pui:text-slate-600 pui:hover:text-indigo-700 pui:hover:underline",
            focusRing(),
          )}
        >
          Figma file
          <PagoPAIcon name="open_in_new" aria-hidden="true" className="pui:size-3" />
        </a>
        <a
          href="https://github.com/pagopa/ui/blob/main/packages/pagopa-ui/src/catalog/figma/registry.json"
          target="_blank"
          rel="noreferrer"
          className={cn(
            "pui:inline-flex pui:items-center pui:gap-1 pui:rounded-sm pui:font-medium pui:text-slate-600 pui:hover:text-indigo-700 pui:hover:underline",
            focusRing(),
          )}
        >
          Registry JSON
          <PagoPAIcon name="open_in_new" aria-hidden="true" className="pui:size-3" />
        </a>
        <a
          href="https://github.com/pagopa/ui/blob/main/.github/CODEOWNERS"
          target="_blank"
          rel="noreferrer"
          className={cn(
            "pui:inline-flex pui:items-center pui:gap-1 pui:rounded-sm pui:font-medium pui:text-slate-600 pui:hover:text-indigo-700 pui:hover:underline",
            focusRing(),
          )}
        >
          Code owners
          <PagoPAIcon name="open_in_new" aria-hidden="true" className="pui:size-3" />
        </a>
        <span className="pui:font-mono pui:text-[10px] pui:text-slate-600">
          {STATUSES.map((status) => `${statusLabel(status)} ${statusCounts[status]}`).join(" · ")}
        </span>
      </div>
    </footer>
  )
}

export function FigmaInventoryDashboard() {
  const [query, setQuery] = React.useState("")
  const [area, setArea] = React.useState<string | "all">("all")
  const [status, setStatus] = React.useState<RegistryStatus | "all">("all")
  const [view, setView] = React.useState<"grid" | "table">("grid")
  const [sort, setSort] = React.useState<SortKey>("page")
  const [page, setPage] = React.useState(1)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)

  const filtered = React.useMemo(
    () => filterRegistryItems(registryItems, { query, area, status }),
    [query, area, status],
  )
  const sorted = React.useMemo(() => sortRegistryItems(filtered, sort), [filtered, sort])

  const pageSize = view === "grid" ? 24 : 20
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const from = sorted.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to = Math.min(sorted.length, currentPage * pageSize)
  const visible = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const selected = selectedId ? (registryItemById.get(selectedId) ?? null) : null
  const hasFilters = query !== "" || area !== "all" || status !== "all"

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (selectedId) return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selectedId])

  function changeQuery(value: string) {
    setQuery(value)
    setPage(1)
  }

  function changeArea(value: string | "all") {
    setArea(value)
    setPage(1)
  }

  function changeStatus(value: RegistryStatus | "all") {
    setStatus(value)
    setPage(1)
  }

  function changeView(value: "grid" | "table") {
    setView(value)
    setPage(1)
  }

  function changeSort(value: SortKey) {
    setSort(value)
    setPage(1)
  }

  function clearFilters() {
    setQuery("")
    setArea("all")
    setStatus("all")
    setPage(1)
  }

  const registryLabel = hasFilters
    ? `${formatNumber(sorted.length)} of ${formatNumber(totals.total)} components`
    : `${formatNumber(totals.total)} components`

  return (
    <div
      className="pui:min-h-dvh pui:bg-slate-50 pui:text-slate-900 pui:antialiased"
      style={{
        fontFamily:
          'Inter, "Inter Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      <Header />

      <main className="pui:mx-auto pui:max-w-[1400px] pui:px-4 pui:py-7 pui:tablet:px-6 pui:tablet:py-9 pui:desktop:px-8">
        <PageHero />

        <section
          aria-labelledby="registry-title"
          className="pui:mt-8 pui:overflow-hidden pui:rounded-2xl pui:border pui:border-slate-200 pui:bg-white pui:shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          <div className="pui:border-b pui:border-slate-200 pui:p-4 pui:tablet:p-5">
            <div className="pui:flex pui:flex-wrap pui:items-end pui:justify-between pui:gap-3">
              <div>
                <h2
                  id="registry-title"
                  className="pui:text-base pui:font-semibold pui:text-slate-900"
                >
                  Component registry
                </h2>
                <p className="pui:mt-0.5 pui:text-xs pui:text-slate-500">
                  Browse the inventory, inspect the variants and compare the canvas with the code
                  contract.
                </p>
              </div>
              <div className="pui:flex pui:items-center pui:gap-2">
                <p
                  aria-live="polite"
                  className="pui:text-[11px] pui:font-medium pui:text-slate-500 pui:tabular-nums"
                >
                  {registryLabel}
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasFilters}
                  className={cn(
                    "pui:rounded-md pui:px-2 pui:py-1 pui:text-[11px] pui:font-medium pui:transition",
                    hasFilters
                      ? "pui:text-indigo-600 pui:hover:bg-indigo-50 pui:hover:text-indigo-700"
                      : "pui:cursor-not-allowed pui:text-slate-300",
                    focusRing(),
                  )}
                >
                  Clear filters
                </button>
              </div>
            </div>

            <div className="pui:mt-4 pui:flex pui:flex-wrap pui:items-center pui:gap-2">
              <SearchField value={query} onChange={changeQuery} inputRef={searchRef} />
              <ViewToggle view={view} onChange={changeView} />
              <SortField value={sort} onChange={changeSort} />
            </div>

            <div className="pui:mt-3 pui:flex pui:flex-col pui:gap-2 pui:border-t pui:border-slate-100 pui:pt-3 pui:desktop:flex-row pui:desktop:items-center pui:desktop:gap-4">
              <AreaField value={area} onChange={changeArea} />
              <StatusFilters value={status} onChange={changeStatus} />
            </div>
          </div>

          <div className={view === "grid" ? "pui:p-4 pui:tablet:p-5" : "pui:p-0"}>
            {visible.length === 0 ? (
              <div className="pui:p-4 pui:tablet:p-5">
                <EmptyState onClear={clearFilters} />
              </div>
            ) : view === "grid" ? (
              <div className="pui:grid pui:gap-3 pui:tablet:grid-cols-2 pui:desktop:grid-cols-3 pui:desktop-xxl:grid-cols-4">
                {visible.map((item) => (
                  <RegistryCard
                    key={item.id}
                    item={item}
                    onInspect={() => setSelectedId(item.id)}
                  />
                ))}
              </div>
            ) : (
              <RegistryTable items={visible} onInspect={(item) => setSelectedId(item.id)} />
            )}
          </div>

          {sorted.length > 0 ? (
            <div className="pui:border-t pui:border-slate-200 pui:px-4 pui:py-3 pui:tablet:px-5">
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                total={sorted.length}
                from={from}
                to={to}
                onChange={setPage}
              />
            </div>
          ) : null}
        </section>

        <PageFooter />
      </main>

      <Inspector item={selected} onClose={() => setSelectedId(null)} />
    </div>
  )
}
