import fs from "node:fs"
import path from "node:path"

/**
 * Every file under `root` with its bytes, in a stable order — what a comparison
 * needs to say a command left the tree as it found it. Each entry's type comes
 * from the listing that produced it, so the walk never asks twice about a path
 * that could change in between.
 */
export function snapshot(root) {
  const entries = []
  const walk = (directory) => {
    const listing = fs
      .readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))
    for (const entry of listing) {
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) walk(absolute)
      else entries.push(`${path.relative(root, absolute)}\0${fs.readFileSync(absolute, "utf8")}`)
    }
  }
  walk(root)
  return entries
}
