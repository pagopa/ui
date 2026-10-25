"use client"

import { useMessages } from "@/lib/ui-provider"
import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"
import { Timeline, type TimelineItem } from "@/components/data-display"

import { Drawer } from "./drawer"

function TimelineDrawer({
  trigger,
  title: titleProp,
  description: descriptionProp,
  items,
  footer,
}: {
  trigger: React.ReactElement
  /** Panel title. @default messages.timelineDrawer.title */
  title?: string
  /** Supporting copy of the panel. @default messages.timelineDrawer.description */
  description?: string
  items: TimelineItem[]
  /** Source footer slot (for example the "download all receipts" action). */
  footer?: React.ReactNode
}) {
  const t = useMessages("timelineDrawer")
  const title = titleProp ?? t.title
  const description = descriptionProp ?? t.description

  return (
    <Drawer
      trigger={trigger}
      title={title}
      description={description}
      icon={<PagoPAPictogram name="History Doc" size={40} />}
      footer={footer}
    >
      <Timeline items={items} />
    </Drawer>
  )
}

export { TimelineDrawer }
