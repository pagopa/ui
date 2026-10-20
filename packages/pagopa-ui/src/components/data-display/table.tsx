import * as React from "react"
import { cn } from "@/lib/cn"

import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"
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

import { TableHeaderField, type TableSort } from "./table-header-field"
import { TableListField } from "./table-list-field"

export interface TableColumn<Row> {
  key: keyof Row & string
  label: string
  sort?: TableSort
  render?: (value: Row[keyof Row], row: Row) => React.ReactNode
}

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
  pagination,
  actionsLabel = "Azioni",
  emptyLabel = "Nessun risultato",
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
  /** Announced name of the row-actions column. @default "Azioni" */
  actionsLabel?: string
  /** Announced text of an empty state with no visible copy. @default "Nessun risultato" */
  emptyLabel?: string
  pagination?: React.ReactNode
  emptyState?: {
    title?: string
    description?: string
    actions?: React.ReactNode
  }
}) {
  const descriptionId = React.useId()
  const tableId = React.useId()
  const hasSorting = columns.some((column) => column.sort)
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
            className={cn(hasSorting ? "@max-narrow/table:block" : "@max-narrow/table:sr-only")}
          >
            <TableRow
              role="row"
              className={cn(hasSorting && "@max-narrow/table:flex @max-narrow/table:flex-wrap")}
            >
              {columns.map((column, index) => (
                <TableHeaderField
                  key={column.key}
                  id={`${tableId}-column-${index}`}
                  role="columnheader"
                  scope="col"
                  aria-label={column.label}
                  sort={column.sort}
                  className={cn(hasSorting && !column.sort && "@max-narrow/table:sr-only")}
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
            {rows.map((row) => (
              <TableRow
                key={row.id}
                role="row"
                className="@max-narrow/table:flex @max-narrow/table:flex-col @max-narrow/table:gap-0 @max-narrow/table:py-2"
              >
                {columns.map((column, index) => (
                  <TableListField
                    key={column.key}
                    headers={`${tableId}-column-${index}`}
                    role="cell"
                    label={column.label}
                    className="@max-narrow/table:block"
                  >
                    {column.render ? column.render(row[column.key], row) : String(row[column.key])}
                  </TableListField>
                ))}
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
            ))}
          </TableBody>
        </TablePrimitive>
      )}
      {rows.length && pagination ? <div>{pagination}</div> : null}
    </section>
  )
}

export { Table }
