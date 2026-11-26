"use client"

import { useMessages } from "@/lib/ui-provider"
import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"
import { Timeline, type TimelineItem } from "@/components/data-display"

import { Drawer, type DrawerProps } from "./drawer"

/**
 * Props of {@link TimelineDrawer}. It keeps {@link Drawer}'s lifecycle — the
 * controlled (`open` + `onOpenChange`) and uncontrolled (`defaultOpen`) modes,
 * the optional `trigger`, `ref`, `className` and the standard HTML attributes
 * of the panel — and owns only the timeline it shows.
 */
interface TimelineDrawerProps extends Omit<
  DrawerProps,
  "title" | "description" | "icon" | "children" | "footer"
> {
  /** Panel title; also the panel's accessible name. @default messages.timelineDrawer.title */
  title?: string
  /** Supporting copy of the panel. @default messages.timelineDrawer.description */
  description?: string
  /** Events to show, in the order the source lists them. */
  items: TimelineItem[]
  /** Source footer slot (for example the "download all receipts" action). */
  footer?: React.ReactNode
}

function TimelineDrawer({
  title: titleProp,
  description: descriptionProp,
  items,
  footer,
  ...drawerProps
}: TimelineDrawerProps) {
  const t = useMessages("timelineDrawer")
  const title = titleProp ?? t.title
  const description = descriptionProp ?? t.description

  return (
    <Drawer
      {...drawerProps}
      title={title}
      description={description}
      icon={<PagoPAPictogram name="History Doc" size={40} />}
      footer={footer}
    >
      <Timeline items={items} />
    </Drawer>
  )
}

export { TimelineDrawer, type TimelineDrawerProps }
