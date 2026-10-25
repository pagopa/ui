import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Code2,
  Copy,
  ExternalLink,
  FileCode2,
  Keyboard,
  Layers,
  LayoutGrid,
  MonitorSmartphone,
  RefreshCw,
  Search,
  Table2,
  Terminal,
  X,
  ScanSearch,
} from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/cn"

import {
  alignmentOf,
  AREAS,
  areaCounts,
  deviceTotals,
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
    badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    dot: "bg-emerald-500",
  },
  pending: {
    badge: "bg-sky-50 text-sky-700 ring-sky-600/20",
    dot: "bg-sky-500",
  },
  mocked: {
    badge: "bg-amber-50 text-amber-700 ring-amber-600/20",
    dot: "bg-amber-500",
  },
  excluded: {
    badge: "bg-slate-100 text-slate-600 ring-slate-500/20",
    dot: "bg-slate-400",
  },
  unaccounted: {
    badge: "bg-rose-50 text-rose-700 ring-rose-600/20",
    dot: "bg-rose-500",
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
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset",
        tone.badge,
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", tone.dot)} />
      {label ?? statusLabel(status)}
    </span>
  )
}

function AreaBadge({ area, className }: { area: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-slate-700 ring-1 ring-slate-500/20 ring-inset",
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-slate-400" />
      {area}
    </span>
  )
}

function focusRing() {
  return "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
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
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md text-[11px] font-medium transition",
        "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
        compact ? "size-6" : "px-2 py-1",
        focusRing(),
        className,
      )}
      title={copied ? "Copied" : "Copy"}
    >
      {copied ? (
        <Check aria-hidden="true" className="size-3.5 text-emerald-600" />
      ) : (
        <Copy aria-hidden="true" className="size-3.5" />
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
    <div ref={wrapper} className="relative min-w-0">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls="figma-resync-panel"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex max-w-full items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-center text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:bg-indigo-700",
          focusRing(),
        )}
      >
        <RefreshCw aria-hidden="true" className="size-3.5" />
        Re-sync Figma
      </button>
      {open ? (
        <div
          id="figma-resync-panel"
          className="absolute top-full right-0 z-50 mt-2 w-[min(23rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Refresh the snapshot</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                This page reads committed JSON. Refresh the inventory locally, review the delta,
                then reload. The commands need <code className="font-mono">FIGMA_TOKEN</code>.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close sync panel"
              className={cn(
                "-mt-1 -mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700",
                focusRing(),
              )}
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
            <Terminal aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-slate-500" />
            <code className="min-w-0 flex-1 font-mono text-[10.5px] leading-relaxed break-all whitespace-pre-wrap text-slate-700">
              {command}
            </code>
            <CopyButton value={command} label="sync command" compact />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <a
              href={inventoryMeta.figmaUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 hover:underline",
                focusRing(),
              )}
            >
              Open the Figma file
              <ArrowUpRight aria-hidden="true" className="size-3" />
            </a>
            <span className="font-mono text-[10px] text-slate-500">
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
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2 px-4 py-2.5 tablet:px-6 desktop:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
            style={{ backgroundImage: "linear-gradient(135deg, #6366f1, #7c3aed)" }}
          >
            <Layers className="size-4" />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[13px] font-semibold text-slate-900">PagoPA UI</p>
            <p className="truncate text-[11px] text-slate-500">
              <span className="tablet:hidden">Figma inventory</span>
              <span className="hidden tablet:inline">Design system · Figma inventory</span>
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 tablet:inline-flex">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />
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
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-slate-100", className)}>
      <div
        className={cn("h-full rounded-full bg-indigo-500 transition-[width]", barClassName)}
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-500 uppercase">
          {label}
        </p>
        <span
          aria-hidden="true"
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-lg",
            iconClassName,
          )}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
        {value}
      </p>
      <div className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</div>
      {children}
    </div>
  )
}

function Kpis() {
  return (
    <div className="mt-6 grid gap-3 tablet:grid-cols-2 desktop:grid-cols-4">
      <KpiCard
        label="Total components"
        value={formatNumber(totals.total)}
        detail={
          <>
            {formatNumber(totals.pages)} Figma pages · {formatNumber(AREAS.length)} areas
          </>
        }
        icon={<Layers className="size-4" />}
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
        icon={<CheckCircle2 className="size-4" />}
        iconClassName="bg-emerald-50 text-emerald-600"
      >
        <ProgressBar value={syncPercent} className="mt-3" barClassName="bg-emerald-500" />
      </KpiCard>
      <KpiCard
        label="Not shipped"
        value={formatNumber(totals.notShipped)}
        detail={
          <>
            {formatNumber(totals.mocked)} mocked · {formatNumber(totals.pending)} pending
          </>
        }
        icon={<CircleAlert className="size-4" />}
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
        icon={<ScanSearch className="size-4" />}
        iconClassName="bg-violet-50 text-violet-600"
      />
    </div>
  )
}

function HealthStrip() {
  const devicePercent =
    deviceTotals.declared === 0 ? 100 : (deviceTotals.covered / deviceTotals.declared) * 100
  return (
    <div className="mt-3 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] desktop:flex-row desktop:items-center desktop:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"
        >
          <MonitorSmartphone className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-700">
            Device parity{" "}
            <span className="font-mono text-[11px] text-slate-500">
              {deviceTotals.covered}/{deviceTotals.declared}
            </span>{" "}
            cases covered
          </p>
          <p className="text-[11px] text-slate-500">
            {deviceTotals.missing} missing across {deviceTotals.nodes} sets with a device axis ·{" "}
            <span className="font-mono">{formatNumber(totals.cases)}</span> committed parity cases
          </p>
          <ProgressBar
            value={devicePercent}
            className="mt-2 h-1 w-44 max-w-full"
            barClassName="bg-violet-500"
          />
        </div>
      </div>
      {unaccountedCount > 0 ? (
        <p className="flex items-center gap-2 text-[11px] text-amber-700">
          <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
          {unaccountedCount} published nodes have no registry entry yet.
        </p>
      ) : (
        <p className="flex items-center gap-2 text-[11px] text-emerald-700">
          <CheckCircle2 aria-hidden="true" className="size-3.5 shrink-0" />
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
    <div className="relative w-full min-w-0 tablet:w-auto tablet:flex-1">
      <label className="sr-only" htmlFor="registry-search">
        Search components
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
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
          "h-9 w-full rounded-lg border border-slate-200 bg-white pr-16 pl-9 text-sm text-slate-900 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition",
          "placeholder:text-slate-600 hover:border-slate-300 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none",
          "[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none",
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
            "absolute top-1/2 right-2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700",
            focusRing(),
          )}
        >
          <X aria-hidden="true" className="size-3.5" />
        </button>
      ) : (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-2.5 flex -translate-y-1/2 items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-sans text-[10px] font-medium text-slate-500"
        >
          <Keyboard className="size-3" />
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition",
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
        focusRing(),
        className,
      )}
    >
      {children}
    </button>
  )
}

function CountPill({ value }: { value: number }) {
  return <span className="font-mono text-[10px] tabular-nums">{formatNumber(value)}</span>
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
    <div className="relative w-full shrink-0 desktop:w-56">
      <select
        aria-label="Filter by area"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pr-8 pl-3 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none"
      >
        <option value="all">All areas</option>
        {AREAS.map((area) => (
          <option key={area} value={area}>
            {areaOption(area)}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-slate-500"
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
      className="m-0 flex min-w-0 flex-wrap items-center gap-1.5 border-0 p-0"
    >
      <span
        aria-hidden="true"
        className="mr-1 text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase"
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
          className={value === status ? `${statusTone[status].badge} ring-1 ring-inset` : undefined}
        >
          <span
            aria-hidden="true"
            className={cn("size-1.5 rounded-full", statusTone[status].dot)}
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
      className="m-0 inline-flex min-w-0 shrink-0 items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5"
    >
      <button
        type="button"
        aria-pressed={view === "grid"}
        aria-label="Grid view"
        onClick={() => onChange("grid")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition",
          view === "grid"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-800",
          focusRing(),
        )}
      >
        <LayoutGrid aria-hidden="true" className="size-3.5" />
        <span className="hidden tablet:inline">Grid</span>
      </button>
      <button
        type="button"
        aria-pressed={view === "table"}
        aria-label="Table view"
        onClick={() => onChange("table")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition",
          view === "table"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-800",
          focusRing(),
        )}
      >
        <Table2 aria-hidden="true" className="size-3.5" />
        <span className="hidden tablet:inline">Table</span>
      </button>
    </fieldset>
  )
}

function isSortKey(value: string): value is SortKey {
  return SORT_OPTIONS.some((option) => option.id === value)
}

function SortField({ value, onChange }: { value: SortKey; onChange: (value: SortKey) => void }) {
  return (
    <div className="relative ml-auto shrink-0 tablet:ml-0">
      <select
        aria-label="Sort components"
        value={value}
        onChange={(event) => {
          if (isSortKey(event.target.value)) onChange(event.target.value)
        }}
        className={cn(
          "h-9 appearance-none rounded-lg border border-slate-200 bg-white pr-8 pl-3 text-[11px] font-medium text-slate-600 transition hover:border-slate-300 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none",
        )}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-slate-500"
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
      <div className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: 8 }, (_, index) => (
          <span
            key={index}
            className={cn(
              "size-7 rounded-md border shadow-[0_1px_1px_rgba(15,23,42,0.04)]",
              index === seed % 8
                ? "border-indigo-200 bg-indigo-100/80"
                : "border-slate-200 bg-white",
            )}
          />
        ))}
      </div>
    )
  }

  if (shape === 1) {
    return (
      <div className="flex w-full flex-col items-center gap-2.5">
        <div
          className="flex h-9 items-center justify-center gap-2 rounded-full border border-indigo-200 bg-white shadow-sm"
          style={{ width: `${width}%` }}
        >
          <span aria-hidden="true" className="size-2 rounded-full bg-indigo-400/80" />
          <span className="h-1.5 w-10 rounded-full bg-indigo-100" />
        </div>
        <span className="h-1.5 w-24 rounded-full bg-slate-200" />
      </div>
    )
  }

  if (shape === 2) {
    return (
      <div
        className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
        style={{ width: `${Math.min(78, width + 12)}%` }}
      >
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-5 rounded-md bg-indigo-100" />
          <span className="h-1.5 w-16 rounded-full bg-slate-300" />
        </div>
        <div className="mt-3 space-y-1.5">
          <span className="block h-1.5 w-full rounded-full bg-slate-100" />
          <span className="block h-1.5 w-4/5 rounded-full bg-slate-100" />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="h-1.5 w-10 rounded-full bg-slate-200" />
          <span className="h-5 w-14 rounded-full bg-indigo-500/80" />
        </div>
      </div>
    )
  }

  return (
    <div
      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
      style={{ width: `${Math.min(82, width + 14)}%` }}
    >
      <div className="flex items-center gap-1 border-b border-slate-100 bg-slate-50/80 px-2.5 py-1.5">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-slate-300" />
        <span aria-hidden="true" className="size-1.5 rounded-full bg-slate-300" />
        <span aria-hidden="true" className="size-1.5 rounded-full bg-slate-300" />
        <span className="ml-2 h-1.5 w-16 rounded-full bg-slate-200" />
      </div>
      <div className="grid grid-cols-3 gap-1.5 p-2.5">
        <span className="col-span-3 h-6 rounded-md bg-indigo-500/10" />
        <span className="h-9 rounded-md bg-slate-100" />
        <span className="h-9 rounded-md bg-slate-100" />
        <span className="h-9 rounded-md bg-indigo-100/70" />
      </div>
    </div>
  )
}

function ComponentPreview({ item }: { item: RegistryItem }) {
  return (
    <div
      aria-hidden="true"
      className="relative h-[132px] overflow-hidden border-b border-slate-100 bg-slate-50/70"
    >
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(148 163 184 / 0.35) 1px, transparent 0)",
          backgroundSize: "14px 14px",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center p-5 transition-transform duration-300 motion-safe:group-hover:scale-[1.03]">
        <PreviewArt item={item} />
      </div>
      <span className="absolute top-2.5 left-2.5 rounded-md border border-slate-200 bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
        {item.area}
      </span>
      {item.box ? (
        <span className="absolute right-2.5 bottom-2.5 rounded-md border border-slate-200 bg-white/90 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
          {item.box.width} × {item.box.height}
        </span>
      ) : null}
      <span className="absolute top-2.5 right-2.5 flex size-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 opacity-0 shadow-sm transition group-hover:opacity-100 group-focus-visible:opacity-100">
        <ArrowUpRight className="size-3.5" />
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
        "inline-flex size-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700",
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
      className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5"
    >
      <button
        type="button"
        onClick={onInspect}
        aria-label={`Inspect ${item.name}`}
        className="block w-full text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-600"
      >
        <ComponentPreview item={item} />
        <div className="space-y-2 px-4 pt-3.5 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
                {item.pageLabel}
              </p>
              <span className="mt-1 block truncate text-[15px] font-semibold text-slate-900">
                {item.name}
              </span>
              <span className="mt-0.5 block truncate font-mono text-[10.5px] text-slate-500">
                {item.moduleFile ?? "Unmapped"} · {item.exportName ?? "No export"}
              </span>
            </div>
            <StatusBadge status={item.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-slate-500">
            <span className="font-medium text-slate-600 tabular-nums">
              {formatNumber(item.variantCount)} variants
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span className="font-mono">{item.nodeId}</span>
            {showDevices ? (
              <>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span data-slot="device-coverage">devices {item.devices.join(", ")}</span>
              </>
            ) : null}
          </div>
        </div>
      </button>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
        <button
          type="button"
          onClick={onInspect}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-indigo-600 transition hover:bg-indigo-50 hover:text-indigo-700",
            focusRing(),
          )}
        >
          Inspect
          <ArrowRight aria-hidden="true" className="size-3" />
        </button>
        <div className="flex items-center gap-0.5">
          <ExternalIconLink href={item.figmaUrl} label={`${item.name} in Figma`}>
            <FigmaMark className="h-3.5 w-2.5" />
          </ExternalIconLink>
          {item.storyUrl ? (
            <a
              href={item.storyUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`${item.name} in Storybook`}
              title={`${item.name} in Storybook`}
              className={cn(
                "inline-flex size-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700",
                focusRing(),
              )}
            >
              <BookOpen aria-hidden="true" className="size-3.5" />
            </a>
          ) : (
            <span
              title="No Storybook page mapped"
              className="inline-flex size-7 items-center justify-center rounded-md text-slate-300"
            >
              <BookOpen aria-hidden="true" className="size-3.5" />
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
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="text-right text-[11px] font-medium text-slate-700">{value}</dd>
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-left">
        <caption className="sr-only">Published components registry</caption>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold tracking-[0.12em] text-slate-600 uppercase">
            <th scope="col" className="px-4 py-2.5">
              Component
            </th>
            <th scope="col" className="px-3 py-2.5">
              Area
            </th>
            <th scope="col" className="px-3 py-2.5">
              Status
            </th>
            <th scope="col" className="px-3 py-2.5 text-right">
              Variants
            </th>
            <th scope="col" className="px-3 py-2.5">
              Figma v
            </th>
            <th scope="col" className="px-3 py-2.5">
              Code v
            </th>
            <th scope="col" className="px-3 py-2.5">
              Devices
            </th>
            <th scope="col" className="px-3 py-2.5 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr
              key={item.id}
              data-node-id={item.nodeId}
              onClick={(event) => {
                if (event.target instanceof Element && event.target.closest("a,button")) return
                onInspect(item)
              }}
              className="group transition hover:bg-slate-50/80"
            >
              <td className="px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => onInspect(item)}
                  className={cn(
                    "block max-w-[18rem] truncate rounded-sm text-left text-[12.5px] font-medium text-slate-900 hover:text-indigo-700",
                    focusRing(),
                  )}
                >
                  {item.name}
                </button>
                <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-500">
                  {item.moduleFile ?? item.pageLabel} · {item.nodeId}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <AreaBadge area={item.area} />
              </td>
              <td className="px-3 py-2.5">
                <StatusBadge status={item.status} />
              </td>
              <td className="px-3 py-2.5 text-right">
                <span className="text-[12px] font-medium text-slate-700 tabular-nums">
                  {formatNumber(item.variantCount)}
                </span>
                <span className="mt-0.5 block text-[10px] text-slate-500">
                  {item.variantAxes.length} axes
                </span>
              </td>
              <td className="px-3 py-2.5">
                <span
                  className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600"
                  title={item.designFingerprint}
                >
                  {shortFingerprint(item.designFingerprint)}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <span
                  className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600"
                  title={item.contractFingerprint}
                >
                  {shortFingerprint(item.contractFingerprint)}
                </span>
              </td>
              <td className="px-3 py-2.5">
                {item.devices.length ? (
                  <span
                    className="block max-w-[9rem] truncate font-mono text-[10.5px] text-slate-600"
                    title={item.devices.join(", ")}
                  >
                    {item.devices.join(", ")}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-300">—</span>
                )}
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center justify-end gap-0.5">
                  <button
                    type="button"
                    onClick={() => onInspect(item)}
                    aria-label={`Inspect ${item.name}`}
                    title="Inspect"
                    className={cn(
                      "inline-flex size-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600",
                      focusRing(),
                    )}
                  >
                    <ScanSearch aria-hidden="true" className="size-3.5" />
                  </button>
                  <ExternalIconLink href={item.figmaUrl} label={`${item.name} in Figma`}>
                    <FigmaMark className="h-3.5 w-2.5" />
                  </ExternalIconLink>
                  {item.storyUrl ? (
                    <ExternalIconLink href={item.storyUrl} label={`${item.name} in Storybook`}>
                      <BookOpen aria-hidden="true" className="size-3.5" />
                    </ExternalIconLink>
                  ) : (
                    <span
                      title="No Storybook page mapped"
                      className="inline-flex size-7 items-center justify-center rounded-md text-slate-300"
                    >
                      <BookOpen aria-hidden="true" className="size-3.5" />
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
    <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
      <p className="text-[11px] text-slate-500">
        Showing <span className="font-medium text-slate-700 tabular-nums">{from}</span>–
        <span className="font-medium text-slate-700 tabular-nums">{to}</span> of{" "}
        <span className="font-medium text-slate-700 tabular-nums">{formatNumber(total)}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className={cn(
            "inline-flex size-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40",
            focusRing(),
          )}
        >
          <ChevronLeft aria-hidden="true" className="size-3.5" />
        </button>
        {pageWindow(page, totalPages).map((candidate, index) =>
          candidate === "gap" ? (
            <span
              key={`gap-${index}`}
              aria-hidden="true"
              className="px-1 text-[11px] text-slate-500"
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
                "inline-flex size-7 items-center justify-center rounded-md border text-[11px] font-medium tabular-nums transition",
                candidate === page
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
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
            "inline-flex size-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40",
            focusRing(),
          )}
        >
          <ChevronRight aria-hidden="true" className="size-3.5" />
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
    icon: <ScanSearch className="size-3.5" />,
  },
  {
    id: "diff",
    label: "Version diff",
    shortLabel: "Version diff",
    icon: <Code2 className="size-3.5" />,
  },
  {
    id: "handoff",
    label: "Handoff & links",
    shortLabel: "Handoff",
    icon: <ArrowUpRight className="size-3.5" />,
  },
]

function OverviewPanel({ item }: { item: RegistryItem }) {
  return (
    <div className="space-y-6">
      <section aria-labelledby="inspector-facts">
        <h3
          id="inspector-facts"
          className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase"
        >
          Registry facts
        </h3>
        <dl className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white px-3">
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
            label="Parity cases"
            value={`${item.caseCount.committed}${item.caseCount.draft ? ` · ${item.caseCount.draft} draft` : ""}`}
          />
          <KeyValue
            label="Registry coverage"
            value={item.entry ? "Direct entry" : item.rule ? "Page rule" : "Unmapped"}
          />
        </dl>
      </section>

      <section aria-labelledby="inspector-axes">
        <div className="flex items-baseline justify-between gap-3">
          <h3
            id="inspector-axes"
            className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase"
          >
            Variant axes
          </h3>
          <span className="text-[10px] text-slate-500">{item.variantAxes.length} total</span>
        </div>
        {item.variantAxes.length ? (
          <div className="mt-2 space-y-2">
            {item.variantAxes.map((axis) => (
              <div
                key={axis.name}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-slate-700">{axis.name}</p>
                  <span className="font-mono text-[9.5px] text-slate-500">{axis.type}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {axis.options.map((option) => (
                    <span
                      key={option}
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[9.5px] ring-1 ring-inset",
                        option === axis.defaultValue
                          ? "bg-indigo-50 text-indigo-700 ring-indigo-600/20"
                          : "bg-slate-50 text-slate-500 ring-slate-200",
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
          <p className="mt-2 rounded-lg border border-dashed border-slate-200 px-3 py-3 text-[11px] text-slate-500">
            This source has no variant axis.
          </p>
        )}
      </section>

      {item.note ? (
        <details className="group rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <summary className="cursor-pointer list-none text-[11px] font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
            <span className="inline-flex items-center gap-1.5">
              <ChevronRight
                aria-hidden="true"
                className="size-3.5 text-slate-500 transition group-open:rotate-90"
              />
              Registry note
            </span>
          </summary>
          <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] leading-relaxed whitespace-pre-line text-slate-600">
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
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600"
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[9.5px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
            {eyebrow}
          </p>
          <p className="truncate text-[11px] font-medium text-slate-700">{title}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5">
        <code className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-slate-600">
          {fingerprint}
        </code>
        <CopyButton value={fingerprint} label={`${eyebrow} fingerprint`} compact />
      </div>
      <dl className="mt-2 divide-y divide-slate-100">
        {rows.map((row) => (
          <KeyValue key={row.label} label={row.label} value={row.value} />
        ))}
      </dl>
    </div>
  )
}

function VersionPanel({ item }: { item: RegistryItem }) {
  const alignment = alignmentOf(item)
  const coverage = item.deviceCoverage
  const comparable = item.status === "implemented" || item.status === "pending"
  const devicePercent = coverage
    ? coverage.declared.length === 0
      ? 100
      : (coverage.covered.length / coverage.declared.length) * 100
    : 100

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 text-[11px]",
          alignment.id === "aligned"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : alignment.id === "partial"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-slate-200 bg-slate-50 text-slate-600",
        )}
      >
        {alignment.id === "aligned" ? (
          <CheckCircle2 aria-hidden="true" className="size-3.5 shrink-0" />
        ) : (
          <CircleAlert aria-hidden="true" className="size-3.5 shrink-0" />
        )}
        <span className="font-medium">{alignment.label}</span>
        <span>
          {item.status === "implemented"
            ? "Canvas and contract are both recorded for this node."
            : "The registry record explains why this node is not compared as shipped."}
        </span>
      </div>

      <div className="grid gap-2 tablet:grid-cols-2">
        <VersionCard
          eyebrow="Figma canvas"
          icon={<FigmaMark className="h-3.5 w-2.5" />}
          title={`${item.variantCount} variant records`}
          fingerprint={item.designFingerprint}
          rows={[
            { label: "Node", value: <span className="font-mono">{item.nodeId}</span> },
            { label: "Type", value: item.type === "COMPONENT_SET" ? "Component set" : "Component" },
            {
              label: "Devices",
              value: item.devices.length ? item.devices.join(", ") : "None",
            },
          ]}
        />
        <VersionCard
          eyebrow="Code contract"
          icon={<FileCode2 className="size-3.5" />}
          title={item.exportName ?? "No export mapped"}
          fingerprint={item.contractFingerprint}
          rows={[
            {
              label: "Module",
              value: <span className="font-mono">{item.moduleFile ?? "Unmapped"}</span>,
            },
            {
              label: "Story exports",
              value: item.storyExports.length ? item.storyExports.length : "—",
            },
            {
              label: "Parity cases",
              value: `${item.caseCount.committed}${item.caseCount.draft ? ` + ${item.caseCount.draft} draft` : ""}`,
            },
          ]}
        />
      </div>

      <section
        aria-labelledby="inspector-parity"
        className="rounded-xl border border-slate-200 bg-white p-3.5"
      >
        <h3
          id="inspector-parity"
          className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase"
        >
          Device parity
        </h3>
        {coverage && coverage.declared.length ? (
          comparable ? (
            <>
              <p className="mt-2 text-[11px] text-slate-600">
                <span className="font-mono text-slate-700">
                  {coverage.covered.length}/{coverage.declared.length}
                </span>{" "}
                declared devices have a committed case.
              </p>
              <ProgressBar
                value={devicePercent}
                className="mt-2"
                barClassName={coverage.missing.length ? "bg-amber-500" : "bg-emerald-500"}
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {coverage.declared.map((device) => {
                  const missing = coverage.missing.includes(device)
                  return (
                    <span
                      key={device}
                      className={cn(
                        "rounded px-1.5 py-0.5 font-mono text-[9.5px] ring-1 ring-inset",
                        missing
                          ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                          : "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
                      )}
                    >
                      {device}
                      {missing ? " · missing" : " · covered"}
                    </span>
                  )
                })}
              </div>
              {coverage.missing.length ? (
                <p className="mt-2 text-[10.5px] text-slate-500">
                  Burn-down command:{" "}
                  <code className="font-mono text-slate-700">
                    pnpm figma:parity:queue --uncovered
                  </code>
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
                The source declares {coverage.declared.join(", ")}. No parity case is expected while
                the registry status is{" "}
                <span className="font-medium text-slate-800">{item.status}</span>.
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {coverage.declared.map((device) => (
                  <span
                    key={device}
                    className="rounded bg-slate-50 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-600 ring-1 ring-slate-200 ring-inset"
                  >
                    {device}
                  </span>
                ))}
              </div>
            </>
          )
        ) : (
          <p className="mt-2 text-[11px] text-slate-500">
            No device axis is declared for this source, so no device case is expected.
          </p>
        )}
      </section>
    </div>
  )
}

function Snippet({ label, code, copyLabel }: { label: string; code: string; copyLabel: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-900 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9.5px] font-semibold tracking-[0.12em] text-slate-500 uppercase">
          {label}
        </p>
        <CopyButton
          value={code}
          label={copyLabel}
          compact
          className="text-slate-500 hover:bg-white/10 hover:text-white"
        />
      </div>
      <pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed text-slate-100">
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
    <div className="space-y-4">
      <section aria-labelledby="inspector-snippets">
        <h3
          id="inspector-snippets"
          className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase"
        >
          Copy-ready snippets
        </h3>
        <div className="mt-2 space-y-2">
          <Snippet label="Import" code={importCode} copyLabel="import snippet" />
          <Snippet label="Usage" code={usageCode} copyLabel="usage snippet" />
        </div>
        {!packageExport ? (
          <p className="mt-2 rounded-lg border border-dashed border-slate-200 px-3 py-2 text-[10.5px] leading-relaxed text-slate-500">
            This node maps to a Storybook template rather than a package entry: there is no
            <code className="mx-1 font-mono">@pagopa/ui</code> import to copy.
          </p>
        ) : null}
      </section>

      <section aria-labelledby="inspector-links">
        <h3
          id="inspector-links"
          className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase"
        >
          Quick links
        </h3>
        <div className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <a
            href={item.figmaUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 text-[11px] text-slate-700 transition hover:bg-slate-50",
              focusRing(),
            )}
          >
            <FigmaMark className="h-3.5 w-2.5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Open the Figma node</span>
              <span className="block truncate font-mono text-[10px] text-slate-500">
                {item.nodeId}
              </span>
            </span>
            <ExternalLink aria-hidden="true" className="size-3.5 shrink-0 text-slate-500" />
          </a>
          {item.storyUrl ? (
            <a
              href={item.storyUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 text-[11px] text-slate-700 transition hover:bg-slate-50",
                focusRing(),
              )}
            >
              <BookOpen aria-hidden="true" className="size-3.5 shrink-0 text-slate-500" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">Open the Storybook page</span>
                <span className="block truncate text-[10px] text-slate-500">{item.storyTitle}</span>
              </span>
              <ExternalLink aria-hidden="true" className="size-3.5 shrink-0 text-slate-500" />
            </a>
          ) : (
            <div className="flex items-center gap-2.5 px-3 py-2.5 text-[11px] text-slate-500">
              <BookOpen aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="flex-1">No Storybook page mapped for this node.</span>
            </div>
          )}
          {item.sourceUrl ? (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 text-[11px] text-slate-700 transition hover:bg-slate-50",
                focusRing(),
              )}
            >
              <FileCode2 aria-hidden="true" className="size-3.5 shrink-0 text-slate-500" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">Read the implementation</span>
                <span className="block truncate font-mono text-[10px] text-slate-500">
                  {item.module}
                </span>
              </span>
              <ExternalLink aria-hidden="true" className="size-3.5 shrink-0 text-slate-500" />
            </a>
          ) : null}
        </div>
      </section>

      {item.storyExports.length ? (
        <section aria-labelledby="inspector-story-exports">
          <h3
            id="inspector-story-exports"
            className="text-[10px] font-semibold tracking-[0.14em] text-slate-500 uppercase"
          >
            Story exports
          </h3>
          <div className="mt-2 flex flex-wrap gap-1">
            {item.storyExports.map((story) => (
              <span
                key={story}
                className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9.5px] text-slate-600"
              >
                {story}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[10.5px] leading-relaxed text-slate-500">
        The story is the source of truth for props and visual states. The registry maps the Figma
        node to its public export; the fingerprints prove both sides were captured.
      </p>
    </div>
  )
}

function InspectorFooter({ item }: { item: RegistryItem }) {
  return (
    <footer className="flex shrink-0 items-center gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-3">
      <a
        href={item.figmaUrl}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-indigo-500 active:bg-indigo-700",
          focusRing(),
        )}
      >
        <FigmaMark className="h-3 w-2.5" />
        Open in Figma
        <ExternalLink aria-hidden="true" className="size-3" />
      </a>
      {item.storyUrl ? (
        <a
          href={item.storyUrl}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900",
            focusRing(),
          )}
        >
          <BookOpen aria-hidden="true" className="size-3.5" />
          Storybook
          <ExternalLink aria-hidden="true" className="size-3" />
        </a>
      ) : (
        <span className="inline-flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 px-3 py-2 text-[11px] text-slate-500">
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
      className="figma-inspector fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-[34rem] overflow-hidden border-l border-slate-200 bg-white p-0 text-slate-900 shadow-2xl"
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
        <div className="flex h-full min-h-0 flex-col">
          <header className="shrink-0 border-b border-slate-200 bg-white px-5 pt-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] text-indigo-600 uppercase">
                  <span>{item.area}</span>
                  <span aria-hidden="true" className="text-slate-300">
                    /
                  </span>
                  <span className="text-slate-500">{item.pageLabel}</span>
                </p>
                <h2
                  id="figma-inspector-title"
                  className="mt-1.5 pr-2 text-xl font-semibold tracking-tight break-words text-slate-900"
                >
                  {item.name}
                </h2>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10.5px] text-slate-500">
                  <span>{item.exportName ?? "No export"}</span>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <span>{item.type === "COMPONENT_SET" ? "Component set" : "Component"}</span>
                  <span aria-hidden="true" className="text-slate-300">
                    ·
                  </span>
                  <span>{item.nodeId}</span>
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={item.status} />
                  {item.devices.map((device) => (
                    <span
                      key={device}
                      className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500"
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
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700",
                  focusRing(),
                )}
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <div role="tablist" aria-label="Component details" className="mt-4 flex gap-1">
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
                    "-mb-px inline-flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-[11px] font-medium transition",
                    tab === candidate.id
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
                    focusRing(),
                  )}
                >
                  <span aria-hidden="true">{candidate.icon}</span>
                  <span className="tablet:hidden">{candidate.shortLabel}</span>
                  <span className="hidden tablet:inline">{candidate.label}</span>
                </button>
              ))}
            </div>
          </header>

          <div
            id={`inspector-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`inspector-tab-${tab}`}
            tabIndex={0}
            className="min-h-0 flex-1 overflow-y-auto px-5 py-5 focus:outline-none"
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
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-slate-200"
      >
        <Search className="size-5" />
      </span>
      <p className="mt-3 text-sm font-medium text-slate-800">No components match</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
        Try a different term, or clear the filters to see the whole published inventory.
      </p>
      <button
        type="button"
        onClick={onClear}
        className={cn(
          "mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50",
          focusRing(),
        )}
      >
        Clear filters
        <X aria-hidden="true" className="size-3" />
      </button>
    </div>
  )
}

// --------------------------------------------------------------- dashboard

function PageHero() {
  return (
    <section aria-labelledby="page-title">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-2xl">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-indigo-700 uppercase">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-indigo-500" />
            Design system · Inventory
          </p>
          <h1
            id="page-title"
            className="mt-3 text-3xl font-semibold tracking-tight break-words text-slate-900 tablet:text-4xl"
          >
            Published components
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
            Every published Figma node, its registry status, the variant matrix and the parity cases
            that prove it. Built for the people who ship the code.
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
            <RefreshCw aria-hidden="true" className="size-3 text-slate-500" />
            Snapshot {formatDate(inventoryMeta.syncedAt)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
            <Layers aria-hidden="true" className="size-3 text-slate-500" />
            {formatNumber(totals.pages)} pages
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-slate-300" />
            File <span className="font-mono text-[10px]">{inventoryMeta.fileKey.slice(0, 7)}…</span>
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
    <footer className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-5 text-[11px] text-slate-500 tablet:flex-row tablet:items-center tablet:justify-between">
      <p className="max-w-xl leading-relaxed">
        Snapshot generated from the Figma REST API on{" "}
        <span className="font-medium text-slate-700">{formatDate(inventoryMeta.syncedAt)}</span>.
        This page reads committed JSON; it never calls Figma at runtime.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={inventoryMeta.figmaUrl}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "inline-flex items-center gap-1 rounded-sm font-medium text-slate-600 hover:text-indigo-700 hover:underline",
            focusRing(),
          )}
        >
          Figma file
          <ExternalLink aria-hidden="true" className="size-3" />
        </a>
        <a
          href="https://github.com/pagopa/ui/blob/main/packages/pagopa-ui/src/catalog/figma/registry.json"
          target="_blank"
          rel="noreferrer"
          className={cn(
            "inline-flex items-center gap-1 rounded-sm font-medium text-slate-600 hover:text-indigo-700 hover:underline",
            focusRing(),
          )}
        >
          Registry JSON
          <ExternalLink aria-hidden="true" className="size-3" />
        </a>
        <a
          href="https://github.com/pagopa/ui/blob/main/.github/CODEOWNERS"
          target="_blank"
          rel="noreferrer"
          className={cn(
            "inline-flex items-center gap-1 rounded-sm font-medium text-slate-600 hover:text-indigo-700 hover:underline",
            focusRing(),
          )}
        >
          Code owners
          <ExternalLink aria-hidden="true" className="size-3" />
        </a>
        <span className="font-mono text-[10px] text-slate-600">
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
      className="min-h-dvh bg-slate-50 text-slate-900 antialiased"
      style={{
        fontFamily:
          'Inter, "Inter Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      <Header />

      <main className="mx-auto max-w-[1400px] px-4 py-7 tablet:px-6 tablet:py-9 desktop:px-8">
        <PageHero />

        <section
          aria-labelledby="registry-title"
          className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          <div className="border-b border-slate-200 p-4 tablet:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="registry-title" className="text-base font-semibold text-slate-900">
                  Component registry
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Browse the inventory, inspect the variants and compare the canvas with the code
                  contract.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p
                  aria-live="polite"
                  className="text-[11px] font-medium text-slate-500 tabular-nums"
                >
                  {registryLabel}
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasFilters}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-medium transition",
                    hasFilters
                      ? "text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                      : "cursor-not-allowed text-slate-300",
                    focusRing(),
                  )}
                >
                  Clear filters
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <SearchField value={query} onChange={changeQuery} inputRef={searchRef} />
              <ViewToggle view={view} onChange={changeView} />
              <SortField value={sort} onChange={changeSort} />
            </div>

            <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 desktop:flex-row desktop:items-center desktop:gap-4">
              <AreaField value={area} onChange={changeArea} />
              <StatusFilters value={status} onChange={changeStatus} />
            </div>
          </div>

          <div className={view === "grid" ? "p-4 tablet:p-5" : "p-0"}>
            {visible.length === 0 ? (
              <div className="p-4 tablet:p-5">
                <EmptyState onClear={clearFilters} />
              </div>
            ) : view === "grid" ? (
              <div className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-3 desktop-xxl:grid-cols-4">
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
            <div className="border-t border-slate-200 px-4 py-3 tablet:px-5">
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
