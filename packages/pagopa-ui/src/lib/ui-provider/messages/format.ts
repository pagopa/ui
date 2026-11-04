// A size in bytes as the file row shows it. It formats a number rather than
// translating words, so both dictionaries share it.
const UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const

// The digits the row shows per unit: whole bytes and kilobytes, one decimal
// from the megabyte up.
function magnitude(size: number, unit: number) {
  if (unit === 0) return String(size)
  if (unit === 1) return String(Math.round(size / 1024))
  return (size / 1024 ** unit).toFixed(1)
}

export function formatFileSize(bytes: number) {
  const size = Number.isFinite(bytes) ? Math.max(0, bytes) : 0
  let unit = 0
  while (unit < UNITS.length - 1 && size >= 1024 ** (unit + 1)) unit += 1
  // Rounding lifts a value to a full 1024 of its unit ("1024 KB",
  // "1024.0 MB"): the size belongs to the next unit, so climb until the
  // printed magnitude fits the unit it names.
  while (unit < UNITS.length - 1 && Number(magnitude(size, unit)) >= 1024) unit += 1
  return `${magnitude(size, unit)} ${UNITS[unit]}`
}
