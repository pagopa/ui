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

// The same walk, as POSIX paths relative to `root` (`src/components/…`).
export function walkRelative(
  root: string,
  directory: string,
  accept: (file: string) => boolean,
): string[] {
  return walkFiles(path.join(root, directory), () => true)
    .map((file) => path.relative(root, file).split(path.sep).join("/"))
    .filter(accept)
    .sort()
}
