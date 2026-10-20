import type { CnFunction } from "cn"
import { createCn } from "cn/config"

import { figmaTextClasses } from "pagopa-ui-tokens"

// The compiled `cn` engine ships Tailwind's default vocabulary; without this
// extension it treats the generated Figma type scale as text colors and drops
// them in conflicts (for example `text-caption-sb` against a chip color).
// The class list is generated from the token manifest, so `pnpm tokens:check`
// keeps the merge tables and the design scale in sync.
const fontSizes = figmaTextClasses.map((className) => className.replace(/^text-/, ""))

export const cn: CnFunction = createCn({
  extend: {
    classGroups: {
      "font-size": [{ text: fontSizes }],
    },
  },
})
