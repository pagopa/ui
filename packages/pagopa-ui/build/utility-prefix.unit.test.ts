// The migration to the prefixed utilities is mechanical, and this is the
// property that keeps it so: every class a component names in a class-name
// position carries the `pui:` prefix, so the mirror never doubles a spelling a
// component did not ask for. Prose and JSX attribute names are not class
// positions — only what reaches a `class` attribute is.
import fs from "node:fs"
import path from "node:path"

import { compile } from "@tailwindcss/node"
import ts from "typescript"
import { expect, test } from "vitest"

import { PREFIX } from "./prefixed-candidates.ts"

const packageRoot = path.resolve(import.meta.dirname, "..")
const libraryEntry = path.join(packageRoot, "src/library.css")
const sourceRoots = ["src/components", "src/lib"].map((root) => path.join(packageRoot, root))

/** Every `.ts`/`.tsx` file a component can live in. */
function sources(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) return sources(file)
    return /\.tsx?$/.test(entry.name) && !/\.unit\.test\./.test(entry.name) ? [file] : []
  })
}

/** The class strings the tree puts in a class-name position. */
function classStrings(file: string) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const found: string[] = []
  const collect = (node: ts.Node) => {
    // A class-name position is a `className` attribute or a class-name call:
    // their string literals are class lists, everything else is not.
    if (ts.isJsxAttribute(node) && node.name.getText(source) === "className" && node.initializer) {
      const visit = (value: ts.Node) => {
        if (ts.isStringLiteral(value)) found.push(value.text)
        else if (ts.isTemplateLiteral(value)) found.push(value.getText(source).slice(1, -1))
        ts.forEachChild(value, visit)
      }
      visit(node.initializer)
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      ["cn", "clsx", "twMerge"].includes(node.expression.text)
    ) {
      const visit = (argument: ts.Node) => {
        if (ts.isStringLiteral(argument) || ts.isTemplateLiteral(argument)) {
          found.push(argument.getText(source).slice(1, -1))
        }
        ts.forEachChild(argument, visit)
      }
      visit(node)
    }
    // A variant map, an array or a ternary is not a class-name position, but a
    // string that already holds a prefixed class is a class list: every token
    // in it is one.
    if (ts.isStringLiteral(node) || ts.isTemplateLiteral(node)) {
      const text = node.getText(source).slice(1, -1)
      if (text.split(/\s+/).some((token) => token.startsWith(PREFIX))) found.push(text)
    }
    ts.forEachChild(node, collect)
  }
  collect(source)
  return found
}

function tokens(classStrings: string[]) {
  return classStrings.flatMap((value) => value.split(/\s+/)).filter(Boolean)
}

/** The class names a stylesheet carries, unescaped. */
function classNames(css: string) {
  const names = new Set<string>()
  for (const match of css.matchAll(/([^{}]*)\{/g)) {
    const prelude = match[1].trim()
    if (!prelude.startsWith(".")) continue
    let name = ""
    for (let index = 1; index < prelude.length; index++) {
      const character = prelude[index]
      if (character === "\\") {
        name += prelude[index + 1]
        index++
        continue
      }
      if (" :.>#+~[*".includes(character)) break
      name += character
    }
    if (name) names.add(name)
  }
  return names
}

test("every class a component names in a class position carries the prefix", async () => {
  const named = new Set(tokens(sourceRoots.flatMap(sources).flatMap(classStrings)))
  const bare = [...named].filter((token) => !token.startsWith(PREFIX))

  const sheet = await compile(`@import "${libraryEntry}";`, {
    base: packageRoot,
    onDependency() {},
  })
  // The hand-written classes the entry ships unconditionally are not utilities:
  // a candidate is one only when naming it adds a rule the empty sheet lacks.
  const unconditional = classNames(sheet.build([]))
  const utilities = new Set([...classNames(sheet.build(bare))].filter((n) => !unconditional.has(n)))

  expect(bare.filter((token) => utilities.has(token))).toEqual([])
})
