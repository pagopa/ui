import * as React from "react"
import { cn } from "@/lib/cn"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Separator } from "@/components/primitives/separator"

export type TimelineItemStatus = "default" | "success" | "error" | "warning" | "info"

/** MicroEvent of an open touchpoint: correction tag plus description. */
export interface TimelineEvent {
  id: React.Key
  correction?: React.ReactNode
  description: React.ReactNode
}

/** Accordion row of the touchpoints composition. */
export interface TimelineTouchpoint {
  id: React.Key
  label: React.ReactNode
  /** Glyph of the row. */
  icon?: React.ReactNode
  /** Correction tag on the header. */
  correction?: React.ReactNode
  defaultOpen?: boolean
  events?: TimelineEvent[]
}

/** Multidestinatario group: recipient label plus the recipient's touchpoints. */
export interface TimelineRecipient {
  id: React.Key
  label: string
  touchpoints: TimelineTouchpoint[]
}

export interface TimelineItem {
  id: React.Key
  title: React.ReactNode
  description?: React.ReactNode
  /** Status card instead of the plain content. */
  status?: TimelineItemStatus
  /** Cursor form: filled, outlined or small. @default "filled" */
  dot?: "filled" | "outlined" | "small"
  /** Timestamp of the event. */
  timestamp?: { month?: string; day?: string; time?: string }
  /** Extra plain-content slot (chip, action button). */
  children?: React.ReactNode
  /** Correction tag of the status card. */
  correction?: React.ReactNode
  /** Status card icon override. */
  icon?: React.ReactNode
  /** Touchpoints accordion list. */
  touchpoints?: TimelineTouchpoint[]
  /** Multidestinatario groups: each recipient labels its own touchpoints. */
  recipients?: TimelineRecipient[]
}

const dotFills: Record<TimelineItemStatus, string> = {
  default: "bg-decorative-secondary",
  success: "bg-success",
  error: "bg-destructive",
  warning: "bg-warning",
  info: "bg-info",
}

const statusCard: Record<TimelineItemStatus, string> = {
  default: "border-border bg-background",
  success: "border-success-foreground bg-success-soft",
  error: "border-error-foreground bg-error-soft",
  warning: "border-warning-foreground bg-warning-soft",
  info: "border-info-foreground bg-info-soft",
}

const statusText: Record<TimelineItemStatus, string> = {
  default: "text-foreground",
  success: "text-success-foreground",
  error: "text-error-foreground",
  warning: "text-warning-foreground",
  info: "text-info-foreground",
}

const statusIcons: Record<TimelineItemStatus, React.ReactElement> = {
  default: <PagoPAIcon name="gavel" size={24} />,
  success: <PagoPAIcon name="check_circle" size={24} />,
  error: <PagoPAIcon name="report" size={24} />,
  warning: <PagoPAIcon name="warning" size={24} />,
  info: <PagoPAIcon name="info" size={24} />,
}

function TimelineDot({
  status,
  dot,
}: {
  status: TimelineItemStatus
  dot: NonNullable<TimelineItem["dot"]>
}) {
  if (dot === "small") {
    return (
      <span className="relative z-10 grid size-6 place-items-center">
        <span className={cn("size-1.5 rounded-full", dotFills[status])} />
      </span>
    )
  }
  if (dot === "outlined") {
    return (
      <span className="relative z-10 grid size-6 place-items-center">
        <span className="size-3 rounded-full border-2 border-decorative-secondary bg-background" />
      </span>
    )
  }
  return (
    <span className="relative z-10 grid size-6 place-items-center">
      <span
        className={cn(
          "size-3 rounded-full shadow-[0_0_0_6px_rgb(14_15_19/0.35)]",
          dotFills[status],
        )}
      />
    </span>
  )
}

function TimelineTimestamp({ month, day, time }: { month?: string; day?: string; time?: string }) {
  return (
    <span className="flex w-10 shrink-0 flex-col gap-2">
      <span className="flex flex-col">
        {month ? <span className="text-body text-foreground">{month}</span> : null}
        {day ? <span className="text-body-sb text-foreground">{day}</span> : null}
      </span>
      {time ? <span className="text-label-mini text-muted-foreground">{time}</span> : null}
    </span>
  )
}

function TimelineTouchpointRow({ touchpoint }: { touchpoint: TimelineTouchpoint }) {
  const [open, setOpen] = React.useState(touchpoint.defaultOpen ?? false)
  return (
    <div className="grid gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 w-full items-center gap-2 rounded-sm text-left outline-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {touchpoint.icon ? (
          <span
            aria-hidden="true"
            className="pointer-events-none shrink-0 [&_svg:not([class*='size-'])]:size-6"
          >
            {touchpoint.icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1 text-label-mini text-foreground">{touchpoint.label}</span>
        {touchpoint.correction}
        <PagoPAIcon
          name="chevron"
          variant={open ? "up" : "down"}
          className="size-6 shrink-0 text-primary"
          aria-hidden="true"
        />
      </button>
      {open && touchpoint.events?.length ? (
        <ul className="grid gap-2">
          {touchpoint.events.map((event) => (
            <li key={event.id} className="grid gap-1 py-2 pl-7">
              {event.correction ? <span className="w-fit">{event.correction}</span> : null}
              <p className="text-label-mini text-foreground">{event.description}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function TimelineTouchpoints({
  touchpoints,
  recipients,
}: {
  touchpoints?: TimelineTouchpoint[]
  recipients?: TimelineRecipient[]
}) {
  if (!touchpoints?.length && !recipients?.length) return null
  return (
    <div className="grid gap-2">
      {touchpoints?.map((touchpoint, index) => (
        <React.Fragment key={touchpoint.id}>
          {index > 0 ? <Separator /> : null}
          <TimelineTouchpointRow touchpoint={touchpoint} />
        </React.Fragment>
      ))}
      {recipients?.map((recipient) => (
        <div key={recipient.id} className="grid gap-2">
          <p className="pl-6 text-label-mini text-muted-foreground">{recipient.label}</p>
          {recipient.touchpoints.map((touchpoint, index) => (
            <React.Fragment key={touchpoint.id}>
              {index > 0 ? <Separator /> : null}
              <TimelineTouchpointRow touchpoint={touchpoint} />
            </React.Fragment>
          ))}
        </div>
      ))}
    </div>
  )
}

function Timeline({ items, label = "Cronologia" }: { items: TimelineItem[]; label?: string }) {
  return (
    // The source pairs the item box with the device: a 16px inset, 12px icon
    // gap and a title row in a page column (848px frames), the 8px inset, 8px
    // gap and the stacked header in the drawer-width frames. The container is
    // the query, so a timeline inside a 417px panel gets the drawer
    // composition without the caller choosing a device.
    <ol aria-label={label} className="@container/timeline grid">
      {items.map((item, index) => {
        const status = item.status ?? "default"
        const last = index === items.length - 1
        return (
          <li key={item.id} className="flex gap-2 pb-8 last:pb-0">
            {item.timestamp ? <TimelineTimestamp {...item.timestamp} /> : null}
            <span className="relative flex w-6 shrink-0 justify-center">
              {last ? null : (
                <span
                  aria-hidden="true"
                  className="absolute top-6 -bottom-8 w-0.5 bg-decorative-secondary"
                />
              )}
              <TimelineDot status={status} dot={item.dot ?? "filled"} />
            </span>
            {item.status ? (
              <div
                className={cn(
                  "flex min-w-0 flex-1 items-start gap-3 rounded-2xl border p-4 @max-tight/timeline:gap-2 @max-tight/timeline:p-2",
                  statusCard[status],
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center",
                    statusText[status],
                  )}
                >
                  {item.icon ?? statusIcons[status]}
                </span>
                <div className={cn("grid min-w-0 flex-1 gap-1", statusText[status])}>
                  <div className="flex flex-wrap items-center gap-3 @max-tight/timeline:flex-col @max-tight/timeline:items-start @max-tight/timeline:gap-1">
                    <span className="text-body-sb">{item.title}</span>
                    {item.correction}
                  </div>
                  {item.description ? <p className="text-label-mini">{item.description}</p> : null}
                  {item.touchpoints || item.recipients ? (
                    // 4px between title and description, 12px between the
                    // title and the group when the description is absent
                    // (thread 1924385837, Elena 2026-10-09).
                    <div className={cn(item.description ? "mt-1" : "mt-2")}>
                      <TimelineTouchpoints
                        touchpoints={item.touchpoints}
                        recipients={item.recipients}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="grid min-w-0 flex-1 gap-2 py-6">
                <div className="grid gap-1">
                  <span className="text-label-mini-sb text-foreground">{item.title}</span>
                  {item.description ? (
                    <p className="text-label-mini text-foreground">{item.description}</p>
                  ) : null}
                </div>
                {item.touchpoints || item.recipients ? (
                  // 4px title/description and 12px title/group without one,
                  // mirroring the status card composition.
                  <div className={cn(!item.description && "mt-1")}>
                    <TimelineTouchpoints
                      touchpoints={item.touchpoints}
                      recipients={item.recipients}
                    />
                  </div>
                ) : null}
                {item.children}
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

export { Timeline }
