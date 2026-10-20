// Pure pagination window used by the Pagination component. Kept out of the
// component file so the node unit tests can exercise it directly.
function pageRange(current: number, total: number) {
  const visible = new Set([1, total, current - 1, current, current + 1])
  const pages = [...visible].filter((page) => page > 0 && page <= total).sort((a, b) => a - b)
  const result: (number | "ellipsis")[] = []
  let previous = 0
  for (const page of pages) {
    if (previous > 0 && page - previous > 1) result.push("ellipsis")
    result.push(page)
    previous = page
  }
  return result
}

export { pageRange }
