// The public token contract: the typed list of the `--pui-*` custom properties
// the tokens stylesheet ships. The `--figma-*` primitives they are generated
// from stay inside the build — a name the stylesheet never declares is not a
// name a host can read or override (ADR-0013 RD2), so neither the inventory nor
// its types are part of this entrypoint. The design tokens package is private,
// so the build bundles it and the declarations inline it.
export { semanticTokens, type SemanticToken, type SemanticTokenType } from "pagopa-ui-tokens"
