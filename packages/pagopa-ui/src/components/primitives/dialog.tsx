// Base UI Dialog, isolated so the library keeps a single seam to the
// third-party implementation: only the primitives layer may import it
// (import layer contract, enforced by `pnpm layers:check`). The composed Dialog lives in overlays.
export { Dialog } from "@base-ui/react/dialog"
