import * as React from "react"

import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/primitives/empty"

import { TableListItem, type TableListItemAction, type TableListItemField } from "./table-list-item"

interface TableListEmptyState {
  title?: string
  description?: string
  actions?: React.ReactNode
  /** Pictogram instance swap; defaults to the Message artwork. */
  pictogram?: React.ReactNode
}

function TableList<Row extends { id: React.Key }>({
  label,
  rows,
  fields,
  action,
  actionFallbackLabel = "Apri",
  pagination,
  emptyLabel = "Nessun risultato",
  emptyState = { title: "Nessun risultato" },
}: {
  /** Accessible name of the list region (source wrapper `aria-label`). */
  label: string
  rows: Row[]
  /** Labelled values of each row (source `.TableListItemField` stack). */
  fields: (row: Row) => TableListItemField[]
  /** Per-row action; omit for static rows. */
  action?: (row: Row) => TableListItemAction | undefined
  /** Text of an action row that carries no label. @default "Apri" */
  actionFallbackLabel?: string
  /** Source Show Pagination footer; hidden in the empty state. */
  pagination?: React.ReactNode
  /** Source State=Empty fallback: pictogram, title, optional subtitle and action. */
  emptyState?: TableListEmptyState
  /** Announced text of an empty state with no visible copy. @default "Nessun risultato" */
  emptyLabel?: string
}) {
  if (!rows.length) {
    return (
      <section aria-label={label} className="flex flex-col gap-8">
        <Empty role="status" className="rounded-lg border">
          <EmptyHeader>
            <EmptyMedia aria-hidden="true">
              {emptyState.pictogram ?? <PagoPAPictogram name="Message" size={56} />}
            </EmptyMedia>
            {emptyState.title || emptyState.description ? (
              <>
                {emptyState.title ? <EmptyTitle>{emptyState.title}</EmptyTitle> : null}
                {emptyState.description ? (
                  <EmptyDescription>{emptyState.description}</EmptyDescription>
                ) : null}
              </>
            ) : (
              <span className="sr-only">{emptyLabel}</span>
            )}
          </EmptyHeader>
          {emptyState.actions ? <EmptyContent>{emptyState.actions}</EmptyContent> : null}
        </Empty>
      </section>
    )
  }
  return (
    <section aria-label={label} className="flex flex-col gap-8">
      <ul className="flex flex-col gap-4">
        {rows.map((row) => (
          <TableListItem
            key={row.id}
            fields={fields(row)}
            action={action?.(row)}
            actionFallbackLabel={actionFallbackLabel}
          />
        ))}
      </ul>
      {pagination}
    </section>
  )
}

export { TableList, type TableListEmptyState }
