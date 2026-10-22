// Markdown tables written the way the workspace formatter prints them: every
// column padded to its widest cell, the delimiter row filled with dashes, at
// least three per column. A generated record then passes `fmt` as written.
// Width counts code points, enough for the ASCII and Latin text the reports carry.
function width(cell: string): number {
  return [...cell].length
}

export function markdownTable(header: string[], rows: string[][]): string[] {
  const widths = header.map((cell, column) =>
    Math.max(3, width(cell), ...rows.map((row) => width(row[column] ?? ""))),
  )
  const pad = (cell: string, size: number) => cell + " ".repeat(size - width(cell))
  const line = (cells: string[]) =>
    `| ${widths.map((size, column) => pad(cells[column] ?? "", size)).join(" | ")} |`
  return [
    line(header),
    `| ${widths.map((size) => "-".repeat(size)).join(" | ")} |`,
    ...rows.map(line),
  ]
}
