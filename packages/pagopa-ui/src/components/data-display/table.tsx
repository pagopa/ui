import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"
import { Checkbox } from "@/components/primitives/checkbox"
import { Heading, type HeadingTag } from "@/components/primitives/heading"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/primitives/empty"
import {
  Table as TablePrimitive,
  TableBody,
  TableCaption,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/primitives/table"
import { Tooltip } from "@/components/overlays/tooltip"

import { TableHeaderField, type TableSort } from "./table-header-field"
import { TableListField } from "./table-list-field"

export interface TableColumn<Row> {
  key: keyof Row & string
  label: string
  sort?: TableSort
  render?: (value: Row[keyof Row], row: Row) => React.ReactNode
  /**
   * Truncates the cell value with an ellipsis and exposes the full value in a
   * tooltip on hover and keyboard focus. The source asks the designer to choose
   * which columns truncate (thread 1664533717).
   */
  truncate?: boolean
  /** Maximum width of a truncated cell, as a CSS length. @default "16rem" */
  maxWidth?: string
}

const defaultTruncatedWidth = "16rem"

function Table<Row extends { id: React.Key }>({
  caption,
  captionHidden = false,
  title,
  titleAs = "h2",
  description,
  actions,
  columns,
  rows,
  rowActions,
  selectable = false,
  selected,
  defaultSelected,
  onSelectionChange,
  selectionLabel: selectionLabelProp,
  selectionRowLabel,
  notification,
  notificationLabel: notificationLabelProp,
  pagination,
  actionsLabel: actionsLabelProp,
  emptyLabel: emptyLabelProp,
  emptyState = { title: "Nessun risultato" },
}: {
  caption: string
  captionHidden?: boolean
  title?: string
  /** Heading tag of the title. @default "h2" */
  titleAs?: HeadingTag
  description?: string
  actions?: React.ReactNode
  columns: TableColumn<Row>[]
  rows: Row[]
  rowActions?: (row: Row) => React.ReactNode
  /** Adds the select-all header checkbox and one checkbox per row. @default false */
  selectable?: boolean
  /** Controlled selection, by row id. */
  selected?: React.Key[]
  /** Initial selection for the uncontrolled table. */
  defaultSelected?: React.Key[]
  /** Called with the next selection, in row order. */
  onSelectionChange?: (selected: React.Key[]) => void
  /** Accessible name of the select-all checkbox. @default messages.table.selectionLabel */
  selectionLabel?: string
  /** Accessible name of a row checkbox, from the row. @default "Seleziona {first cell}" */
  selectionRowLabel?: (row: Row) => string
  /** Marks a row with the source notification dot after its checkbox. */
  notification?: (row: Row) => boolean
  /** Accessible name of the notification dot. @default messages.table.notificationLabel */
  notificationLabel?: string
  /** Announced name of the row-actions column. @default messages.table.actionsLabel */
  actionsLabel?: string
  /** Announced text of an empty state with no visible copy. @default messages.table.emptyLabel */
  emptyLabel?: string
  pagination?: React.ReactNode
  emptyState?: {
    title?: string
    description?: string
    actions?: React.ReactNode
  }
}) {
  const t = useMessages("table")
  const selectionLabel = selectionLabelProp ?? t.selectionLabel
  const notificationLabel = notificationLabelProp ?? t.notificationLabel
  const actionsLabel = actionsLabelProp ?? t.actionsLabel
  const emptyLabel = emptyLabelProp ?? t.emptyLabel

  const descriptionId = React.useId()
  const tableId = React.useId()
  const [internalSelected, setInternalSelected] = React.useState<React.Key[]>(defaultSelected ?? [])
  const hasSorting = columns.some((column) => column.sort)
  const selectedIds = selected ?? internalSelected
  const selectedSet = new Set(selectedIds)
  const allSelected = rows.length > 0 && rows.every((row) => selectedSet.has(row.id))
  const someSelected = rows.some((row) => selectedSet.has(row.id))
  const showHeaderOnMobile = hasSorting || selectable

  const updateSelection = (next: React.Key[]) => {
    const rowOrder = new Map(rows.map((row, index) => [row.id, index]))
    const ordered = [...new Set(next)].sort(
      (a, b) =>
        (rowOrder.get(a) ?? Number.MAX_SAFE_INTEGER) - (rowOrder.get(b) ?? Number.MAX_SAFE_INTEGER),
    )
    if (selected === undefined) setInternalSelected(ordered)
    onSelectionChange?.(ordered)
  }

  const rowLabel = (row: Row) => {
    if (selectionRowLabel) return selectionRowLabel(row)
    const first = columns[0] ? row[columns[0].key] : undefined
    const text = first == null ? "" : String(first)
    return text ? `Seleziona ${text}` : "Seleziona riga"
  }

  return (
    <section
      aria-label={caption}
      className="@container/table flex min-w-0 flex-col gap-2 rounded-lg bg-secondary p-2"
    >
      {title || description || actions ? (
        <header className="flex flex-wrap items-start justify-between gap-4">
          {title || description ? (
            <div className="min-w-0">
              {title ? (
                <Heading as={titleAs} className="text-h4">
                  {title}
                </Heading>
              ) : null}
              {description ? (
                <p id={descriptionId} className="text-caption text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
          ) : null}
          {actions}
        </header>
      ) : null}
      {!rows.length ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia aria-hidden="true">
              <PagoPAPictogram name="Message" size={56} />
            </EmptyMedia>
            {emptyState.title || emptyState.description ? (
              <div className="flex w-full flex-col gap-0.5">
                {emptyState.title ? (
                  <EmptyTitle className="text-muted-soft">{emptyState.title}</EmptyTitle>
                ) : null}
                {emptyState.description ? (
                  <EmptyDescription>{emptyState.description}</EmptyDescription>
                ) : null}
              </div>
            ) : (
              <span className="sr-only">{emptyLabel}</span>
            )}
          </EmptyHeader>
          {emptyState.actions ? <EmptyContent>{emptyState.actions}</EmptyContent> : null}
        </Empty>
      ) : (
        // Explicit roles preserve table semantics when mobile CSS changes display.
        <TablePrimitive
          role="table"
          variant="data"
          aria-label={caption}
          aria-describedby={description ? descriptionId : undefined}
          className="@max-narrow/table:block"
        >
          <TableCaption className={cn(captionHidden && "sr-only")}>{caption}</TableCaption>
          <TableHeader
            role="rowgroup"
            className={cn(
              showHeaderOnMobile ? "@max-narrow/table:block" : "@max-narrow/table:sr-only",
            )}
          >
            <TableRow
              role="row"
              className={cn(
                showHeaderOnMobile && "@max-narrow/table:flex @max-narrow/table:flex-wrap",
              )}
            >
              {selectable ? (
                <TableHeaderField
                  id={`${tableId}-selection`}
                  role="columnheader"
                  scope="col"
                  className="pr-0"
                >
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onCheckedChange={(checked) =>
                      updateSelection(checked ? rows.map((row) => row.id) : [])
                    }
                    aria-label={selectionLabel}
                  />
                </TableHeaderField>
              ) : null}
              {columns.map((column, index) => (
                <TableHeaderField
                  key={column.key}
                  id={`${tableId}-column-${index}`}
                  role="columnheader"
                  scope="col"
                  aria-label={column.label}
                  sort={column.sort}
                  className={cn(
                    !column.sort && (hasSorting || selectable) && "@max-narrow/table:sr-only",
                  )}
                >
                  {column.label}
                </TableHeaderField>
              ))}
              {rowActions ? (
                <TableHeaderField
                  id={`${tableId}-actions`}
                  role="columnheader"
                  scope="col"
                  className="@max-narrow/table:sr-only"
                >
                  <span className="sr-only">{actionsLabel}</span>
                </TableHeaderField>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody role="rowgroup" className="@max-narrow/table:block">
            {rows.map((row) => {
              const isSelected = selectedSet.has(row.id)
              return (
                <TableRow
                  key={row.id}
                  role="row"
                  aria-selected={selectable ? isSelected : undefined}
                  data-state={isSelected ? "selected" : undefined}
                  className="@max-narrow/table:flex @max-narrow/table:flex-col @max-narrow/table:gap-0 @max-narrow/table:py-2"
                >
                  {selectable ? (
                    <TableCell
                      role="cell"
                      className="@max-narrow/table:block @max-narrow/table:pb-2"
                      headers={`${tableId}-selection`}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            updateSelection(
                              checked
                                ? [...selectedIds, row.id]
                                : selectedIds.filter((id) => id !== row.id),
                            )
                          }
                          aria-label={rowLabel(row)}
                        />
                        {notification?.(row) ? (
                          <span
                            role="img"
                            aria-label={notificationLabel}
                            className="size-2 shrink-0 rounded-full bg-primary"
                          />
                        ) : null}
                      </div>
                    </TableCell>
                  ) : null}
                  {columns.map((column, index) => {
                    const value = column.render
                      ? column.render(row[column.key], row)
                      : String(row[column.key])
                    return (
                      <TableListField
                        key={column.key}
                        headers={`${tableId}-column-${index}`}
                        role="cell"
                        label={column.label}
                        className="@max-narrow/table:block"
                      >
                        {column.truncate ? (
                          <Tooltip
                            showClose={false}
                            trigger={
                              // The truncated value is the tooltip trigger, so
                              // it must take keyboard focus to reveal the full
                              // text; otherwise the affordance is mouse-only.
                              // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- focus reveals the full value
                              <span
                                tabIndex={0}
                                className="block max-w-full truncate outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                                style={{ maxWidth: column.maxWidth ?? defaultTruncatedWidth }}
                              >
                                {value}
                              </span>
                            }
                          >
                            {value}
                          </Tooltip>
                        ) : (
                          value
                        )}
                      </TableListField>
                    )
                  })}
                  {rowActions ? (
                    <TableCell
                      role="cell"
                      data-actions
                      headers={`${tableId}-actions`}
                      className="@max-narrow/table:mt-2 @max-narrow/table:block"
                    >
                      <div className="flex items-center justify-end gap-2">{rowActions(row)}</div>
                    </TableCell>
                  ) : null}
                </TableRow>
              )
            })}
          </TableBody>
        </TablePrimitive>
      )}
      {rows.length && pagination ? <div>{pagination}</div> : null}
    </section>
  )
}

export { Table }
