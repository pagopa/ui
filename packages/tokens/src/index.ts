// The design foundations of the Figma library, exported as typed data.
//
// The generated modules are the committed result of `figma-tokens.mjs --write`;
// the JSON beside them is the reviewed record. A consumer reads the package, so
// a moved or renamed generated file changes this package only.
export {
  figmaTokenSource,
  figmaTokens,
  type FigmaToken,
  type FigmaTokenType,
} from "./figma-tokens.generated"
export { figmaTextClasses } from "./figma-text-classes.generated"
// The public contract: the semantic roles a host styles against. They are named
// for the role, so a Figma variable rename never reaches them.
export { semanticTokens, type SemanticToken, type SemanticTokenType } from "./pui-tokens.generated"
