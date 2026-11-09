export const VISUAL_WIDTHS = [320, 600, 1200] as const

// Each excluded story carries the cause that keeps it out of the gate.
export const UNSTABLE_VISUAL_STORIES = new Set<string>([])

type IndexEntry = {
  id?: string
  type: string
  tags?: string[]
}

export function isVisualStory(entry: IndexEntry): boolean {
  return entry.type === "story" && !(entry.tags ?? []).includes("no-visual")
}

export function selectedVisualStories(
  entries: Record<string, IndexEntry>,
  scope: Set<string> | null,
): string[] {
  return Object.entries(entries)
    .filter(([, entry]) => isVisualStory(entry))
    .map(([key, entry]) => entry.id ?? key)
    .filter((id) => scope === null || scope.has(id))
    .sort((a, b) => a.localeCompare(b))
}

export function visualSnapshotName(story: string, width: number): string {
  return `${story}-${width}.png`
}
