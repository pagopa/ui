// The public token contract: the typed list of the `--pui-*` custom properties
// the tokens stylesheet ships, beside the internal `--figma-*` primitives they
// are generated from — build-time data, never a name the stylesheet declares.
// The design tokens package is private, so the build bundles it and the
// declarations inline it.
export {
  figmaTokens,
  figmaTokenSource,
  semanticTokens,
  type FigmaToken,
  type FigmaTokenType,
  type SemanticToken,
  type SemanticTokenType,
} from "pagopa-ui-tokens"
