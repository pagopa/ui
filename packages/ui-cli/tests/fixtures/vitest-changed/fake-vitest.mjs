// Test double for the Vitest entry point: it records the arguments it receives
// and exits with the code in FAKE_VITEST_EXIT. `vitest-changed.test.mjs` points
// PAGOPA_UI_VITEST_BIN at it, so the wrapper is exercised without a test run.
import fs from "node:fs"

const target = process.env.FAKE_VITEST_ARGS_FILE
if (target) fs.writeFileSync(target, `${JSON.stringify(process.argv.slice(2))}\n`)
process.exitCode = Number(process.env.FAKE_VITEST_EXIT ?? 0)
