// Base UI Combobox, isolated so the library keeps a single seam to the
// third-party implementation: only the primitives layer may import it
// (import layer contract, enforced by `pnpm layers:check`). The composed Autocomplete lives in inputs.
export { Combobox } from "@base-ui/react/combobox"
