// The accessibility contract pass runs from a Vitest afterEach (registered for
// the storybook test projects in vite.config.ts). Storybook's own afterEach
// chain records the story surface and completes normally; failing here fails
// the test without aborting the runner, which keeps the next story clean.
//
// The pass itself lives in ./a11y-contract.ts together with the preview
// recorder.
import { afterEach } from "vitest"

import { runA11yContract } from "./a11y-contract"

afterEach(async () => {
  await runA11yContract()
})
