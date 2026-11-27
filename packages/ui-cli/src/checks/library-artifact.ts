// Static contract of the published artifact: built CSS, fonts, licenses and
// dependency boundaries. No browser, no network; the library check calls it
// before installing the tarball in the isolated consumer.
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import type { Workspace } from "../adapters/workspace.ts"
import { walkRelative } from "../lib/fs.ts"
import { parseSchema } from "../lib/validate.ts"
import { IconManifestSchema } from "../schemas/artwork.ts"
import { clientModules } from "./client-directives.ts"

// Public export surface asserted on the packed module, and the retired or
// demo exports that must stay out of the artifact.
export const REQUIRED_EXPORTS = [
  "Accordion",
  "Alert",
  "AuthenticationCodeInput",
  "Autocomplete",
  "Avatar",
  "Badge",
  "Banner",
  "Breadcrumb",
  "Button",
  "Card",
  "CheckboxField",
  "DatePicker",
  "DatePickerField",
  "Dialog",
  "Dropdown",
  "Drawer",
  "Footer",
  "Header",
  "Input",
  "Label",
  "ListItem",
  "MenuDropdown",
  "PagoPAIcon",
  "PagoPAPictogram",
  "Pagination",
  "Popover",
  "ProductCard",
  "ProgressKpi",
  "RadioField",
  "SelectField",
  "Separator",
  "Snackbar",
  "Spinner",
  "Stepper",
  "Switch",
  "SwitchField",
  "Table",
  "Tabs",
  "Tag",
  "TextareaField",
  "TextField",
  "Timeline",
  "Tooltip",
]

export const FORBIDDEN_EXPORTS = [
  "Dashboard",
  "TemplateShell",
  "ButtonGroupSingleElement",
  "TimelineItemConnector",
  "TimelineItemDot",
  "AuthenticationCodeSingleInput",
  "TextFieldHelperText",
  "TextAreaHelperText",
  "SwitchSingleElement",
  "StepDesktop",
  "StepMobile",
  "Connector",
  "NumberedPlaceholder",
  "SideNavItem",
  "SideNavProfileItem",
  "FooterCompanyInformation",
  "BreadcrumbItem",
  "PaginationItem",
  "KpiBody",
  "KpiData",
  "TimelineConnector",
  "TimelineDot",
  "TimelineTimestamp",
  "TimelineTouchpoint",
  "TimelinePosition",
  "AvatarSmall",
  "AvatarBig",
  "Gravatar",
  "RetryAction",
  "ExternalLinkLabel",
  "AccordionItem",
  "UnstyledButton",
  "ProductCardImage",
]

const PackageManifestSchema = z.looseObject({
  name: z.string(),
  license: z.string().optional(),
  publishConfig: z
    .looseObject({ access: z.string().optional(), registry: z.string().optional() })
    .optional(),
  exports: z.record(z.string(), z.union([z.string(), z.record(z.string(), z.string())])),
  peerDependencies: z.record(z.string(), z.string()).optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
})

export type ArtifactContract = {
  manifest: z.infer<typeof PackageManifestSchema>
  stylesFile: string
  expectedIconVariants: number
  expectedIconVariantIds: string[]
  expectedIconPaints: number
}

const GENERATED_ICONS = "src/components/icons/generated"

// The per-node identifier namespace keeps masks unique, so a paint comparison
// drops it. Two pinned variants can still repeat one geometry — a checked radio
// repeats the check glyph — so the count is the number of distinct drawings,
// which is what a packed artifact must reproduce.
function sourceIconPaints(read: (file: string) => string, root: string): number {
  const paints = new Set<string>()
  for (const file of walkRelative(root, GENERATED_ICONS, (entry) => entry.endsWith(".tsx"))) {
    for (const match of read(file).matchAll(
      /data-figma-node-id="([^"]+)"[^>]*>([\s\S]*?)<\/svg>/g,
    )) {
      const prefix = match[1].toLowerCase().replace(/[^a-z0-9]+/g, "-")
      paints.add(match[2].replaceAll(`${prefix}-`, ""))
    }
  }
  return paints.size
}

export const GITHUB_PACKAGES_REGISTRY = "https://npm.pkg.github.com"
export const REACT_PEER_RANGE = "^19.0.0"

export type LicenceFiles = {
  /** The `LICENSE` text at the repository root, or null when the file is absent. */
  root: string | null
  /** The `LICENSE` text shipped by the package, or null when the file is absent. */
  package: string | null
}

// The distribution contract of the published package: the licence it declares
// in its manifests, the registry and visibility it publishes to, and the peer
// range its consumers can meet.
export function distributionProblems(
  manifest: z.infer<typeof PackageManifestSchema>,
  licences: LicenceFiles,
): string[] {
  const problems: string[] = []
  if (manifest.license !== "MIT")
    problems.push(`license is ${JSON.stringify(manifest.license)}, expected "MIT"`)
  if (manifest.publishConfig?.access !== "public")
    problems.push('publishConfig.access must be "public"')
  if (manifest.publishConfig?.registry !== GITHUB_PACKAGES_REGISTRY)
    problems.push(`publishConfig.registry must be ${GITHUB_PACKAGES_REGISTRY}`)
  for (const name of ["react", "react-dom"] as const)
    if (manifest.peerDependencies?.[name] !== REACT_PEER_RANGE)
      problems.push(`${name} peer must be ${REACT_PEER_RANGE}`)
  for (const [where, text] of [
    ["repository root", licences.root],
    ["package", licences.package],
  ] as const) {
    if (!text) problems.push(`missing LICENSE at the ${where}`)
    else if (!/^MIT License\b/.test(text))
      problems.push(`the LICENSE at the ${where} is not the MIT text`)
  }
  return problems
}

// The demo surface owns the geometry: the artboard heights, the frame widths
// and the demo grid columns that only the templates and the artboards read. A
// published stylesheet declaring one of them ships a value no shipped component
// resolves, so a consumer receives geometry it never renders.
//
// The reference is the source that reads the value, not the sheet that declares
// it: a demo variable still declared in `index.css` never reached
// `preview.css`, and comparing the two sheets alone let it pass. A property is
// demo geometry when the demo sources name it and no library source does, which
// is the rule `demoGeometryProblems` enforces — the move to the preview sheet is
// then the fix, not the detection.
export function demoGeometryProblems(
  styles: string,
  sources: { demo: string[]; library: string[] },
): string[] {
  const named = (texts: string[], name: string): boolean =>
    texts.some((text) => text.includes(name))
  return [...customProperties(styles)]
    .filter((name) => named(sources.demo, name) && !named(sources.library, name))
    .sort()
}

function customProperties(styles: string): Set<string> {
  const names = new Set<string>()
  for (const match of styles.matchAll(/(--[\w-]+)\s*:/g)) if (match[1]) names.add(match[1])
  return names
}

// The source text a check reads when it asks who resolves a custom property: a
// stylesheet or a module carries the `var(--…)` reference or the `w-(--…)`
// utility, and prose does not, so a guide mentioning a name cannot suppress a
// finding.
function readSources(root: string, directory: string): string[] {
  return walkRelative(root, directory, (file) => /\.(?:css|ts|tsx)$/.test(file)).map((file) =>
    fs.readFileSync(path.join(root, file), "utf8"),
  )
}

export function verifyArtifactContract(workspace: Workspace): ArtifactContract {
  const { root } = workspace
  const at = (file: string): string => path.join(root, file)
  const manifest = parseSchema(
    PackageManifestSchema,
    JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")),
    "package.json",
  )
  const stylesEntry = manifest.exports["./styles.css"]
  const stylesFile = typeof stylesEntry === "string" ? stylesEntry : stylesEntry?.default
  assert.equal(
    stylesFile,
    "./dist/styles.css",
    "the package must export built CSS, not a stylesheet requiring consumer build tools",
  )
  assert.ok(fs.existsSync(at(stylesFile)), "missing standalone stylesheet — run pnpm build")
  const styles = fs.readFileSync(at(stylesFile), "utf8")
  assert.doesNotMatch(
    styles,
    /@(?:import|tailwind|theme|apply|source)\b/,
    "published CSS must not require Tailwind, shadcn or source imports",
  )
  // ADR-0013 RD2: the Figma primitive layer is the build-time input of the
  // --pui-* contract, not part of it. The build resolves every reference, so a
  // primitive that reaches either stylesheet is a resolution that stopped
  // working, not a value to document.
  for (const file of ["dist/styles.css", "dist/tokens.css"]) {
    assert.ok(fs.existsSync(at(file)), `missing ${file} — the public stylesheets must ship`)
    assert.doesNotMatch(
      fs.readFileSync(at(file), "utf8"),
      /--figma-/,
      `${file}: the internal Figma primitive layer must not reach the published CSS`,
    )
  }
  assert.deepEqual(
    demoGeometryProblems(styles, {
      demo: readSources(workspace.storiesRoot, "src"),
      library: readSources(root, "src/components"),
    }),
    [],
    "the published stylesheet must not declare demo or artboard geometry — it belongs in apps/storybook/src/preview.css",
  )
  const fontURLs = [...styles.matchAll(/url\(["']?([^"')\s]+)["']?\)/g)]
    .map((match) => match[1])
    .filter((url): url is string => typeof url === "string" && url.endsWith(".woff2"))
  assert.equal(
    new Set(fontURLs).size,
    3,
    "publish only the three bundled text fonts; source SVG icons must not require an icon font",
  )
  assert.doesNotMatch(
    styles,
    /Material Symbols|material-symbols-outlined/,
    "do not ship an unused icon font",
  )
  for (const url of fontURLs) {
    assert.ok(fs.existsSync(path.resolve(path.dirname(at(stylesFile)), url)), `missing font ${url}`)
  }
  assert.ok(fs.existsSync(at("dist/licenses/titillio.txt")), "missing bundled text font license")
  assert.ok(
    fs.existsSync(at("dist/licenses/artwork.txt")),
    "missing the packaged artwork provenance notice",
  )
  for (const file of ["dist/tokens.css", "dist/tokens.js", "dist/types/tokens.d.ts"]) {
    assert.ok(fs.existsSync(at(file)), `missing ${file} — the public token entries must ship`)
  }
  const iconManifest = parseSchema(
    IconManifestSchema,
    JSON.parse(
      fs.readFileSync(
        path.join(workspace.artworkRoot, "src/assets/figma-icons/manifest.json"),
        "utf8",
      ),
    ),
    "icon manifest",
  )
  const expectedIconVariants = Object.values(iconManifest.entries).reduce(
    (count, entry) => count + Object.keys(entry.variants).length,
    0,
  )
  assert.ok(expectedIconVariants > 0, "the pinned icon manifest must publish variants")
  const expectedIconVariantIds = Object.values(iconManifest.entries)
    .flatMap((entry) => Object.keys(entry.variants))
    .sort()
  assert.equal(
    fs.existsSync(at("dist/licenses/material-symbols-outlined.txt")),
    false,
    "remove the retired icon font",
  )
  assert.ok(
    manifest.peerDependencies?.react && manifest.peerDependencies?.["react-dom"],
    "React and ReactDOM must be shared with the consuming application",
  )
  const licence = (file: string): string | null =>
    fs.existsSync(at(file)) ? fs.readFileSync(at(file), "utf8") : null
  assert.deepEqual(
    distributionProblems(manifest, {
      root: licence(path.join("..", "..", "LICENSE")),
      package: licence("LICENSE"),
    }),
    [],
    "the package must publish MIT from GitHub Packages on the React 19 peer range",
  )

  // The per-module build must publish the directive of every client module:
  // a Server Component accepts a client module only when the module declares
  // itself, and a bundler keeps that boundary only per module.
  const client = new Set(clientModules(root).map((entry) => entry.file))
  const distModules = walkRelative(root, "dist", (file) => file.endsWith(".js"))
  const withoutDirective: string[] = []
  for (const file of distModules) {
    const base = path.join("src", path.relative("dist", file)).replace(/\.js$/, "")
    const source = [`${base}.tsx`, `${base}.ts`].find((candidate) => fs.existsSync(at(candidate)))
    if (!source || !client.has(source)) continue
    if (!/^["']use client/.test(fs.readFileSync(at(file), "utf8"))) withoutDirective.push(file)
  }
  assert.deepEqual(
    withoutDirective,
    [],
    'a client module reached the artifact without its "use client" directive',
  )
  assert.deepEqual(
    [
      "react",
      "react-dom",
      "tailwindcss",
      "@tailwindcss/vite",
      "tw-animate-css",
      "shadcn",
      "@fontsource/titillium-web",
      "@fontsource/material-symbols-outlined",
    ].filter((name) => Object.hasOwn(manifest.dependencies ?? {}, name)),
    [],
    "the runtime package must not install a second React or its styling/build toolchain",
  )

  const expectedIconPaints = sourceIconPaints((file) => fs.readFileSync(at(file), "utf8"), root)
  assert.ok(expectedIconPaints > 0, "the compiled icon components must draw something")

  return { manifest, stylesFile, expectedIconVariants, expectedIconVariantIds, expectedIconPaints }
}
