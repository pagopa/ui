"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { Icon } from "@/components/icons/icon"
import { Default as CheckCircleIcon } from "@/components/icons/generated/check-circle"
import {
  Default as ChevronDownIcon,
  Up as ChevronUpIcon,
} from "@/components/icons/generated/chevron"
import { Default as GavelIcon } from "@/components/icons/generated/gavel"
import { Default as InfoIcon } from "@/components/icons/generated/info"
import { Default as ReportIcon } from "@/components/icons/generated/report"
import { Default as WarningIcon } from "@/components/icons/generated/warning"
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
  /** Timestamp of the event, drawn in the leading column. */
  timestamp?: { month?: string; day?: string; time?: string }
  /** Time line under the description, from the source second `Description`. */
  time?: string
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
  default: "pui:bg-decorative-secondary",
  success: "pui:bg-success",
  error: "pui:bg-destructive",
  warning: "pui:bg-warning",
  info: "pui:bg-info",
}

const statusCard: Record<TimelineItemStatus, string> = {
  default: "pui:border-border pui:bg-background",
  success: "pui:border-success-foreground pui:bg-success-soft",
  error: "pui:border-error-foreground pui:bg-error-soft",
  warning: "pui:border-warning-foreground pui:bg-warning-soft",
  info: "pui:border-info-foreground pui:bg-info-soft",
}

const statusText: Record<TimelineItemStatus, string> = {
  default: "pui:text-foreground",
  success: "pui:text-success-foreground",
  error: "pui:text-error-foreground",
  warning: "pui:text-warning-foreground",
  info: "pui:text-info-foreground",
}

const statusIcons: Record<TimelineItemStatus, React.ReactElement> = {
  default: <Icon source={GavelIcon} size={24} />,
  success: <Icon source={CheckCircleIcon} size={24} />,
  error: <Icon source={ReportIcon} size={24} />,
  warning: <Icon source={WarningIcon} size={24} />,
  info: <Icon source={InfoIcon} size={24} />,
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
      <span className="pui:relative pui:z-10 pui:grid pui:size-6 pui:place-items-center">
        <span className={cn("pui:size-1.5 pui:rounded-full", dotFills[status])} />
      </span>
    )
  }
  if (dot === "outlined") {
    return (
      <span className="pui:relative pui:z-10 pui:grid pui:size-6 pui:place-items-center">
        <span className="pui:size-3 pui:rounded-full pui:border-2 pui:border-decorative-secondary pui:bg-background" />
      </span>
    )
  }
  return (
    <span className="pui:relative pui:z-10 pui:grid pui:size-6 pui:place-items-center">
      <span
        className={cn(
          "pui:size-3 pui:rounded-full pui:shadow-[0_0_0_6px_rgb(14_15_19/0.35)]",
          dotFills[status],
        )}
      />
    </span>
  )
}

function TimelineTimestamp({ month, day, time }: { month?: string; day?: string; time?: string }) {
  return (
    <span className="pui:flex pui:w-10 pui:shrink-0 pui:flex-col pui:gap-2">
      <span className="pui:flex pui:flex-col">
        {month ? <span className="pui:text-body pui:text-foreground">{month}</span> : null}
        {day ? <span className="pui:text-body-sb pui:text-foreground">{day}</span> : null}
      </span>
      {time ? <span className="pui:text-label-mini pui:text-muted-foreground">{time}</span> : null}
    </span>
  )
}

function TimelineTouchpointRow({ touchpoint }: { touchpoint: TimelineTouchpoint }) {
  const [open, setOpen] = React.useState(touchpoint.defaultOpen ?? false)
  return (
    <div className="pui:grid pui:gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="pui:flex pui:min-h-11 pui:w-full pui:items-center pui:gap-2 pui:rounded-sm pui:text-left pui:outline-none pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"
      >
        {touchpoint.icon ? (
          <span
            aria-hidden="true"
            className="pui:pointer-events-none pui:shrink-0 pui:[&_svg:not(.pagopa-icon)]:size-6"
          >
            {touchpoint.icon}
          </span>
        ) : null}
        <span className="pui:min-w-0 pui:flex-1 pui:text-label-mini pui:text-foreground">
          {touchpoint.label}
        </span>
        {touchpoint.correction}
        <Icon
          source={open ? ChevronUpIcon : ChevronDownIcon}
          className="pui:size-6 pui:shrink-0 pui:text-primary"
          aria-hidden="true"
        />
      </button>
      {open && touchpoint.events?.length ? (
        <ul className="pui:grid pui:gap-2">
          {touchpoint.events.map((event) => (
            <li key={event.id} className="pui:grid pui:gap-1 pui:py-2 pui:pl-7">
              {event.correction ? <span className="pui:w-fit">{event.correction}</span> : null}
              <p className="pui:text-label-mini pui:text-foreground">{event.description}</p>
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
    <div className="pui:grid pui:gap-2">
      {touchpoints?.map((touchpoint, index) => (
        <React.Fragment key={touchpoint.id}>
          {index > 0 ? <Separator /> : null}
          <TimelineTouchpointRow touchpoint={touchpoint} />
        </React.Fragment>
      ))}
      {recipients?.map((recipient) => (
        <div key={recipient.id} className="pui:grid pui:gap-2">
          <p className="pui:pl-6 pui:text-label-mini pui:text-muted-foreground">
            {recipient.label}
          </p>
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

export interface TimelineProps {
  items: TimelineItem[]
  /** Accessible name of the timeline list. @default messages.timeline.label */
  label?: string
}

function Timeline({ items, label: labelProp }: TimelineProps) {
  const t = useMessages("timeline")
  const label = labelProp ?? t.label
  // A row without a timestamp still reserves the leading column when a sibling
  // carries one, so every cursor stays on the same rail.
  const hasTimestamps = items.some((item) => item.timestamp)

  return (
    // The source pairs the item box with the device: a 16px inset, 12px icon
    // gap and a title row in a page column (848px frames), the 8px inset, 8px
    // gap and the stacked header in the drawer-width frames. The container is
    // the query, so a timeline inside a 417px panel gets the drawer
    // composition without the caller choosing a device.
    <ol data-slot="timeline" aria-label={label} className="pui:@container/timeline pui:grid">
      {items.map((item, index) => {
        const status = item.status ?? "default"
        const last = index === items.length - 1
        return (
          <li key={item.id} className="pui:flex pui:gap-2 pui:pb-8 pui:last:pb-0">
            {item.timestamp ? (
              <TimelineTimestamp {...item.timestamp} />
            ) : hasTimestamps ? (
              <span aria-hidden="true" className="pui:w-10 pui:shrink-0" />
            ) : null}
            <span
              data-slot="timeline-cursor"
              className="pui:relative pui:flex pui:w-6 pui:shrink-0 pui:justify-center"
            >
              {last ? null : (
                <span
                  aria-hidden="true"
                  className="pui:absolute pui:top-6 pui:-bottom-8 pui:w-0.5 pui:bg-decorative-secondary"
                />
              )}
              <TimelineDot status={status} dot={item.dot ?? "filled"} />
            </span>
            {item.status ? (
              <div
                className={cn(
                  "pui:flex pui:min-w-0 pui:flex-1 pui:items-start pui:gap-3 pui:rounded-2xl pui:border pui:p-4 pui:@max-tight/timeline:gap-2 pui:@max-tight/timeline:p-2",
                  statusCard[status],
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "pui:flex pui:size-6 pui:shrink-0 pui:items-center pui:justify-center",
                    statusText[status],
                  )}
                >
                  {item.icon ?? statusIcons[status]}
                </span>
                <div
                  className={cn("pui:grid pui:min-w-0 pui:flex-1 pui:gap-1", statusText[status])}
                >
                  <div className="pui:flex pui:flex-wrap pui:items-center pui:gap-3 pui:@max-tight/timeline:flex-col pui:@max-tight/timeline:items-start pui:@max-tight/timeline:gap-1">
                    <span className="pui:text-body-sb">{item.title}</span>
                    {item.correction}
                  </div>
                  {item.description ? (
                    <p className="pui:text-label-mini">{item.description}</p>
                  ) : null}
                  {item.time ? (
                    <span className="pui:text-caption pui:leading-none pui:uppercase pui:text-muted-foreground">
                      {item.time}
                    </span>
                  ) : null}
                  {item.touchpoints || item.recipients ? (
                    // 4px between title and description, 12px between the
                    // title and the group when the description is absent
                    // (thread 1924385837, Elena 2026-10-09).
                    <div className={cn(item.description ? "pui:mt-1" : "pui:mt-2")}>
                      <TimelineTouchpoints
                        touchpoints={item.touchpoints}
                        recipients={item.recipients}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              // No top padding: the cursor and the copy share the row top, so a
              // plain row lines up with a timestamped or carded one.
              <div className="pui:grid pui:min-w-0 pui:flex-1 pui:gap-2 pui:pb-6">
                <div className="pui:grid pui:gap-1">
                  <span className="pui:text-label-mini-sb pui:text-foreground">{item.title}</span>
                  {item.description ? (
                    <p className="pui:text-label-mini pui:text-foreground">{item.description}</p>
                  ) : null}
                  {item.time ? (
                    <span className="pui:text-caption pui:leading-none pui:uppercase pui:text-muted-foreground">
                      {item.time}
                    </span>
                  ) : null}
                </div>
                {item.touchpoints || item.recipients ? (
                  // 4px title/description and 12px title/group without one,
                  // mirroring the status card composition.
                  <div className={cn(!item.description && "pui:mt-1")}>
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
