import type { Workspace } from "../adapters/workspace.ts"
import { report, type CheckReport } from "../checks/report.ts"
import { checkIcons } from "./icons.ts"
import { checkPictograms } from "./pictograms.ts"

export async function checkArtwork(workspace: Workspace): Promise<CheckReport> {
  const [icons, pictograms] = await Promise.all([checkIcons(workspace), checkPictograms(workspace)])
  return report("artwork", "icons and pictograms", [
    ...icons.problems.map((problem) => `icons: ${problem}`),
    ...pictograms.problems.map((problem) => `pictograms: ${problem}`),
  ])
}
