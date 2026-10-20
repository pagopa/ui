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
