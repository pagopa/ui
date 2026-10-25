import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"
import { Timeline, type TimelineItem } from "@/components/data-display"

import { Drawer } from "./drawer"

function TimelineDrawer({
  trigger,
  title = "Cronologia",
  description = "Eventi in ordine cronologico",
  items,
  footer,
}: {
  trigger: React.ReactElement
  title?: string
  /** Supporting copy of the panel. @default "Eventi in ordine cronologico" */
  description?: string
  items: TimelineItem[]
  /** Source footer slot (for example the "download all receipts" action). */
  footer?: React.ReactNode
}) {
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
