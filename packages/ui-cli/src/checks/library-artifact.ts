// Static contract of the published artifact: built CSS, fonts, licenses and
// dependency boundaries. No browser, no network; the library check calls it
// before installing the tarball in the isolated consumer.
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { z } from "zod"

import { artworkPath } from "../lib/paths.ts"
import { parseSchema } from "../lib/validate.ts"
import { IconManifestSchema } from "../schemas/artwork.ts"

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
  exports: z.record(z.string(), z.union([z.string(), z.record(z.string(), z.string())])),
  peerDependencies: z.record(z.string(), z.string()).optional(),
  dependencies: z.record(z.string(), z.string()).optional(),
})

export type ArtifactContract = {
  manifest: z.infer<typeof PackageManifestSchema>
  stylesFile: string
  expectedIconVariants: number
  expectedIconVariantIds: string[]
}

export function verifyArtifactContract(root: string): ArtifactContract {
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
  assert.ok(fs.existsSync(stylesFile), "missing standalone stylesheet — run pnpm build")
  const styles = fs.readFileSync(stylesFile, "utf8")
  assert.doesNotMatch(
    styles,
    /@(?:import|tailwind|theme|apply|source)\b/,
    "published CSS must not require Tailwind, shadcn or source imports",
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
    assert.ok(fs.existsSync(path.resolve(path.dirname(stylesFile), url)), `missing font ${url}`)
  }
  assert.ok(fs.existsSync("dist/licenses/titillio.txt"), "missing bundled text font license")
  assert.ok(
    fs.existsSync("dist/licenses/artwork.txt"),
    "missing the packaged artwork provenance notice",
  )
  const iconManifest = parseSchema(
    IconManifestSchema,
    JSON.parse(fs.readFileSync(artworkPath("src/assets/figma-icons/manifest.json"), "utf8")),
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
    fs.existsSync("dist/licenses/material-symbols-outlined.txt"),
    false,
    "remove the retired icon font",
  )
  assert.ok(
    manifest.peerDependencies?.react && manifest.peerDependencies?.["react-dom"],
    "React and ReactDOM must be shared with the consuming application",
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

  return { manifest, stylesFile, expectedIconVariants, expectedIconVariantIds }
}
