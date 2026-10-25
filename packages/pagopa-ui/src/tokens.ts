// The public token contract: the typed list of the `--figma-*` custom
// properties the stylesheet ships. The design tokens package is private, so the
// build bundles it and the declarations inline it.
export {
  figmaTokens,
  figmaTokenSource,
  type FigmaToken,
  type FigmaTokenType,
} from "pagopa-ui-tokens"
