import { fetchFigmaImagesPng } from "../figma/rest.ts"
import { figmaToken } from "./figma-token.ts"

export function figmaImages(env: NodeJS.ProcessEnv) {
  return (key: string, version: string, ids: string[]) =>
    fetchFigmaImagesPng(key, version, ids, figmaToken(env))
}
export const now = () => new Date()
