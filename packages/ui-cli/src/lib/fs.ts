import fs from "node:fs"
import path from "node:path"

// A recursive file walk with a caller-owned predicate. The checks share it so
// "walk this directory for TypeScript files" has one implementation.
export function walkFiles(directory: string, accept: (file: string) => boolean): string[] {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) return walkFiles(full, accept)
    return accept(full) ? [full] : []
  })
}
