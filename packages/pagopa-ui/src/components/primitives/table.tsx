"use client"

import * as React from "react"
import { cn } from "@/lib/cn"

function Table({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"table"> & { variant?: "default" | "data" }) {
  return (
    <div
      data-slot="table-container"
      role="group"
      aria-label={props["aria-label"]}
      aria-labelledby={props["aria-labelledby"]}
      tabIndex={0}
      className="pui:relative pui:w-full pui:overflow-x-auto pui:focus-visible:outline-2 pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"
    >
      <table
        data-slot="table"
        data-variant={variant}
        className={cn(
          "pui:w-full pui:caption-bottom",
          variant === "data" ? "pui:text-body" : "pui:text-label-mini",
          className,
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("pui:[&_tr]:border-b pui:in-data-[variant=data]:bg-secondary", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn(
        "pui:[&_tr:last-child]:border-0 pui:in-data-[variant=data]:bg-background",
        className,
      )}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "pui:border-t pui:bg-muted/50 pui:text-label-mini-sb pui:[&>tr]:last:border-b-0",
        className,
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "pui:border-b pui:transition-colors pui:hover:bg-muted/50 pui:has-aria-expanded:bg-muted/50 pui:data-[state=selected]:bg-accent pui:in-data-[variant=data]:border-secondary",
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "pui:h-10 pui:px-2 pui:text-left pui:align-middle pui:text-label-mini-sb pui:whitespace-nowrap pui:text-foreground pui:in-data-[variant=data]:h-12 pui:in-data-[variant=data]:px-4 pui:[&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "pui:p-2 pui:align-middle pui:whitespace-nowrap pui:in-data-[variant=data]:h-12 pui:in-data-[variant=data]:px-4 pui:in-data-[variant=data]:py-3 pui:in-data-[variant=data]:data-actions:py-0 pui:in-data-[variant=data]:@max-narrow/table:h-auto pui:[&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("pui:mt-4 pui:text-caption pui:text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }
