import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"

// Nx does not hash ignored snapshots through file inputs.
const snapshot = new URL("../../../pagopa-ui/.figma/rules.json", import.meta.url)
let fingerprint: string
try {
  fingerprint = createHash("sha256").update(readFileSync(snapshot)).digest("hex")
} catch (error) {
  if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error
  fingerprint = "missing"
}
console.log(fingerprint)
