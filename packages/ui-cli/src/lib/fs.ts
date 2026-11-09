import fs from "node:fs"
import path from "node:path"

// A recursive file walk with a caller-owned predicate. The checks share it so
// "walk this directory for TypeScript files" has one implementation. It never
// descends into dependencies or dot-directories: `node_modules` links back into
// workspace packages whose caches change while other tasks run.
export function walkFiles(directory: string, accept: (file: string) => boolean): string[] {
  if (!fs.existsSync(directory)) return []
  // The read order is the filesystem's, so it is fixed here: a walk that reports
  // in directory order makes every caller's output depend on the machine.
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const full = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        return entry.name === "node_modules" || entry.name.startsWith(".")
          ? []
          : walkFiles(full, accept)
      }
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
