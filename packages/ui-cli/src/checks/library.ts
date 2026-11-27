// Verify the actual packed artifact in an isolated application after `pnpm build`.
import assert from "node:assert/strict"
import fs from "node:fs"
import { createRequire } from "node:module"
import os from "node:os"
import path from "node:path"
import { z } from "zod"
import { pathToFileURL } from "node:url"
import type { Workspace } from "../adapters/workspace.ts"
import { walkFiles } from "../lib/fs.ts"
import { parseSchema } from "../lib/validate.ts"
import { FORBIDDEN_EXPORTS, REQUIRED_EXPORTS, verifyArtifactContract } from "./library-artifact.ts"
import { report, type CheckReport } from "./report.ts"
import {
  buildNext,
  nodeExecutable,
  runCommand,
  runStreamingCommand,
  startNextServer,
} from "./library/process.ts"

export interface LibraryOptions {
  /** The environment every consumer install and browser run inherits. */
  env: NodeJS.ProcessEnv
  /** Progress lines; the check streams its child processes to stdio. */
  log: (line: string) => void
}

const file = "dist/pagopa-ui.js"
const typesFile = "dist/types/pagopa-ui.d.ts"

function assertIsolatedInstall(directory: string, names: string[]): void {
  const root = fs.realpathSync(directory)
  for (const name of names) {
    const installed = path.join(directory, "node_modules", ...name.split("/"))
    assert.ok(fs.existsSync(installed), `${name} was not installed in the consumer`)
    const relative = path.relative(root, fs.realpathSync(installed))
    assert.ok(
      relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative),
      `${name} resolved outside the isolated consumer`,
    )
  }
}

const ImportedPackageSchema = z.looseObject({
  exports: z.array(z.string()),
  undefinedExports: z.array(z.string()),
  sharedReact: z.boolean(),
  tokens: z.number(),
  rendered: z.string(),
  renderedCalendar: z.string(),
  renderedProduct: z.string(),
  renderedAvatar: z.string(),
})

type Runner = {
  run: (command: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv) => string
  stream: (command: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv) => Promise<void>
}

type ConsumerContext = {
  root: string
  toolingRoot: string
  temporary: string
  consumer: string
  archive: string
  packageName: string
  installedVersion: (name: string) => string
  toolingVersion: (name: string) => string
  runner: Runner
}

function toolingPath(context: ConsumerContext, ...segments: string[]): string {
  return path.join(context.toolingRoot, ...segments)
}

function createRunner(env: NodeJS.ProcessEnv): Runner {
  return {
    run: (command, args, cwd, overrides) =>
      runCommand(command, args, cwd, { ...env, ...overrides }),
    stream: (command, args, cwd, overrides) =>
      runStreamingCommand(command, args, cwd, { ...env, ...overrides }),
  }
}

function prepareConsumer(context: ConsumerContext): void {
  const {
    root,
    consumer,
    archive,
    packageName,
    installedVersion,
    runner: { run },
  } = context
  run("pnpm", ["pack", "--out", archive, "--json"], root)
  fs.cpSync(toolingPath(context, "tests/fixtures/library-consumer"), consumer, { recursive: true })
  // The fixture names the package by placeholder so the workspace graph does
  // not read it as a dependency; the consumer imports the installed tarball.
  const entry = path.join(consumer, "main.tsx")
  fs.writeFileSync(
    entry,
    fs.readFileSync(entry, "utf8").replaceAll("__PAGOPA_UI_PACKAGE__", packageName),
  )
  fs.copyFileSync(
    path.join(root, "src/assets/storybook/1526-6505.png"),
    path.join(consumer, "avatar-source-logo.png"),
  )
  fs.writeFileSync(
    path.join(consumer, "package.json"),
    JSON.stringify(
      {
        private: true,
        type: "module",
        scripts: { build: "tsc -p tsconfig.json && vite build" },
        dependencies: {
          [packageName]: `file:${archive}`,
          react: installedVersion("react"),
          "react-dom": installedVersion("react-dom"),
        },
        devDependencies: {
          "@types/react": installedVersion("@types/react"),
          "@types/react-dom": installedVersion("@types/react-dom"),
          typescript: installedVersion("typescript"),
          vite: installedVersion("vite"),
        },
      },
      null,
      2,
    ),
  )
  run(
    "pnpm",
    [
      "install",
      "--ignore-workspace",
      "--prefer-offline",
      "--ignore-scripts",
      "--reporter=append-only",
    ],
    consumer,
  )
  assertIsolatedInstall(consumer, [packageName, "react", "react-dom", "vite", "typescript"])
  for (const name of ["tailwindcss", "shadcn", "@tailwindcss/vite"]) {
    assert.equal(
      fs.existsSync(path.join(consumer, "node_modules", name)),
      false,
      `${name} leaked into the consumer`,
    )
  }
}

function packedImportAssertions(
  packageSpecifier: string,
  tokensSpecifier: string,
  iconsSpecifier: string,
): string {
  return `import * as mod from ${packageSpecifier}
  import * as tokens from ${tokensSpecifier}
  import * as icons from ${iconsSpecifier}
  import * as React from "react"
  import { createRequire } from "node:module"
  import assert from "node:assert/strict"
  import { renderToString } from "react-dom/server"
  const app = createRequire(import.meta.url)
  const library = createRequire(import.meta.resolve(${packageSpecifier}))
  assert.throws(
    () => renderToString(React.createElement(mod.PagoPAIcon, { name: "info", variant: "instagram" })),
    /Icon "info" has no source asset for variant "instagram"/,
    "unsupported icon variants must not silently render the default artwork",
  )
  assert.throws(
    () => renderToString(React.createElement(mod.PagoPAIcon, { name: "arrow", filled: true })),
    /does not publish filled and outlined source variants/,
    "filled must not pretend to exist on a source without filled states",
  )
  assert.throws(
    () => renderToString(React.createElement(mod.PagoPAIcon, { name: "info", filled: true, variant: "outlined" })),
    /choose filled or variant, not both/,
    "conflicting state selectors must fail explicitly",
  )
  assert.equal(
    renderToString(React.createElement(mod.PagoPAIcon, { name: "not-a-published-icon" })),
    "",
    "an unknown icon name must render nothing instead of failing the surface that hosts it",
  )
  const packedIcon = renderToString(
    React.createElement(mod.PagoPAIcon, { name: "info", decorative: false, label: "Informazioni" }),
  )
  assert.match(packedIcon, /^<svg/, "packed icons must paint inline, not through an image request")
  assert.doesNotMatch(packedIcon, /<img/)
  assert.match(packedIcon, /viewBox="0 0 24 24"/)
  assert.match(packedIcon, /fill="currentColor"/)
  assert.match(packedIcon, /data-figma-node-id="/)
  assert.match(packedIcon, /role="img"/)
  assert.match(packedIcon, /aria-label="Informazioni"/)
  const packedSubpathIcon = renderToString(React.createElement(icons.Info, { width: 32 }))
  assert.match(
    packedSubpathIcon,
    /^<svg[^>]*width="32"/,
    "the icons subpath must publish one tree-shakeable component per identity",
  )
  assert.match(packedSubpathIcon, /data-figma-node-id="/)
  assert.throws(
    () => renderToString(React.createElement(mod.ProductCard, {
      title: "Conflicting action",
      href: "/products",
      onAction: () => {},
    })),
    /ProductCard: choose href or onAction, not both/,
    "untyped consumers must not silently discard a competing product action",
  )
  for (const Menu of [mod.Dropdown, mod.MenuDropdown]) {
    assert.throws(
      () => renderToString(React.createElement(Menu, {
        triggerLabel: "Server actions",
        items: [{ id: "missing", label: "Missing action" }],
      })),
      /Menu item "missing": enabled actions require onSelect/,
      "enabled packed menu items must not silently do nothing",
    )
    assert.doesNotThrow(
      () => renderToString(React.createElement(Menu, {
        triggerLabel: "Server actions",
        items: [{ id: "unavailable", label: "Unavailable action", disabled: true }],
      })),
      "a disabled packed menu item does not need an action",
    )
  }
  `
}

const packedImportResult = `console.log(JSON.stringify({
  exports: Object.keys(mod),
  undefinedExports: Object.keys(mod).filter((name) => typeof mod[name] === "undefined"),
  sharedReact: app.resolve("react") === library.resolve("react"),
  tokens: tokens.figmaTokens.length,
  rendered: renderToString(React.createElement(mod.Button, null, "Server rendered button")),
  renderedCalendar: renderToString(React.createElement(mod.DatePicker, {
    value: new Date(2026, 4, 11),
    onConfirm: () => {},
    onCancel: () => {},
  })),
  renderedProduct: renderToString(React.createElement(mod.ProductCard, {
    title: "Server rendered product",
    href: "/server-products",
  })),
  renderedAvatar: renderToString(React.createElement(mod.Avatar, {
    alt: "Server rendered identity",
    selected: true,
    loading: true,
    status: "busy",
    secondary: { alt: "Associated server identity", initials: "OR" },
  })),
}))
`

function readPackedImport(context: ConsumerContext): z.infer<typeof ImportedPackageSchema> {
  const {
    consumer,
    packageName,
    runner: { run },
  } = context
  const packageSpecifier = JSON.stringify(packageName)
  const tokensSpecifier = JSON.stringify(`${packageName}/tokens`)
  const iconsSpecifier = JSON.stringify(`${packageName}/icons`)
  return parseSchema(
    ImportedPackageSchema,
    JSON.parse(
      run(
        nodeExecutable,
        [
          "--input-type=module",
          "-e",
          packedImportAssertions(packageSpecifier, tokensSpecifier, iconsSpecifier) +
            packedImportResult,
        ],
        consumer,
      ),
    ),
    "packed import",
  )
}

function validatePackedImport(imported: z.infer<typeof ImportedPackageSchema>): void {
  assert.deepEqual(
    REQUIRED_EXPORTS.filter((name) => !imported.exports.includes(name)),
    [],
    "missing packed exports",
  )
  assert.deepEqual(
    imported.exports.filter((name) => FORBIDDEN_EXPORTS.includes(name)),
    [],
    "packed demo, no-op or shallow-wrapper exports",
  )
  assert.deepEqual(imported.undefinedExports, [], "undefined packed exports")
  assert.equal(imported.sharedReact, true, "the library uses a different React instance")
  assert.ok(imported.tokens > 0, "the packed token entry must export the typed token list")
  assert.match(imported.rendered, /<button[^>]*>Server rendered button<\/button>/)
  assert.match(imported.renderedCalendar, /role="grid"/, "source calendar must support SSR")
  assert.match(
    imported.renderedProduct,
    /<h3[^>]*>Server rendered product<\/h3>/,
    "packed product titles must remain native headings during SSR",
  )
  assert.match(imported.renderedProduct, /<a[^>]*href="\/server-products"/)
  assert.equal((imported.renderedAvatar.match(/role="img"/g) ?? []).length, 2)
  assert.match(
    imported.renderedAvatar,
    /aria-label="Server rendered identity"[^>]*aria-busy="true"/,
  )
  assert.match(imported.renderedAvatar, /aria-label="Associated server identity"/)
  assert.match(imported.renderedAvatar, /Selezionato/)
  assert.doesNotMatch(imported.renderedAvatar, /<button|aria-selected=/)
}

function compileConsumer(context: ConsumerContext): void {
  const {
    consumer,
    runner: { run },
  } = context
  run("pnpm", ["run", "build"], consumer)
  run(
    "pnpm",
    [
      "exec",
      "tsc",
      "-p",
      "tsconfig.json",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
    ],
    consumer,
  )
}

// A consumer that imports one icon must receive one icon: the per-module
// build is what makes that boundary a bundler fact, so the assertion reads the
// tree-shaken output instead of the module graph.
function iconIdentityIds(code: string): string[] {
  return [...code.matchAll(/["']?data-figma-node-id["']?\s*[:=]\s*["']([^"']+)["']/g)].map(
    (match) => match[1],
  )
}

// A bundle fails this when it asks the network for artwork instead of drawing
// it. The alternatives are anchored so that a utility-name table
// (`mask-image-linear-pos`) does not read as a request.
const requestsArtwork = /\.svg\b|data:image\/svg/
// A glyph drawn through a mask is the workaround #158 removes. Component
// bundles legitimately mask their own geometry (the spinner arc), so only the
// single-icon bundle is held to it.
const masksGlyph = /mask-?image\s*[:=]/

async function verifyTreeShakenIconBundle(
  context: ConsumerContext,
  audited: NodeRequire,
  slug: string,
): Promise<void> {
  const generated = path.join(context.root, "src/components/icons/generated", `${slug}.tsx`)
  const identityIds = new Set(iconIdentityIds(fs.readFileSync(generated, "utf8")))
  assert.ok(identityIds.size > 0, `the generated ${slug} module lost its source provenance`)
  const entry = path.join(context.consumer, "icon-entry.tsx")
  fs.writeFileSync(
    entry,
    `import Icon from "${context.packageName}/icons/${slug}"\n\nconsole.log(Icon)\n`,
  )
  const { build } = await import(pathToFileURL(audited.resolve("vite")).href)
  const built = await build({
    root: context.consumer,
    configFile: false,
    envDir: false,
    logLevel: "silent",
    build: {
      write: false,
      minify: false,
      rollupOptions: { input: entry, external: [/^react($|\/)/] },
    },
  })
  const results = Array.isArray(built) ? built : "output" in built ? [built] : []
  const code = results
    .flatMap((result) => result.output)
    .map((output) => (output.type === "chunk" ? output.code : ""))
    .join("\n")
  const packed = iconIdentityIds(code)
  assert.ok(packed.length > 0, "the tree-shaken bundle lost the imported icon")
  assert.match(code, /viewBox["']?\s*[:=]/, "the tree-shaken bundle lost the source frame")
  assert.deepEqual(
    packed.filter((id) => !identityIds.has(id)),
    [],
    "importing one source icon must not bundle another identity's artwork",
  )
  assert.doesNotMatch(
    code,
    new RegExp(`${requestsArtwork.source}|${masksGlyph.source}`),
    "packed icons must draw their geometry instead of requesting artwork",
  )
}

// A shipped component draws only the glyphs it renders: a component that
// imports one icon must not drag the pinned set into the bundle.
async function verifyComponentIconBundle(
  context: ConsumerContext,
  audited: NodeRequire,
): Promise<void> {
  const generated = path.join(context.root, "src/components/icons/generated")
  const registry = new Set(
    fs
      .readdirSync(generated)
      .filter((name) => name.endsWith(".tsx") && name !== "types.tsx")
      .flatMap((name) => iconIdentityIds(fs.readFileSync(path.join(generated, name), "utf8"))),
  )
  assert.ok(registry.size > 0, "the generated icon set lost its source provenance")
  const entry = path.join(context.consumer, "component-entry.tsx")
  fs.writeFileSync(
    entry,
    `import { Dialog } from "${context.packageName}"\n\nconsole.log(Dialog)\n`,
  )
  const { build } = await import(pathToFileURL(audited.resolve("vite")).href)
  const built = await build({
    root: context.consumer,
    configFile: false,
    envDir: false,
    logLevel: "silent",
    build: {
      write: false,
      minify: false,
      rollupOptions: { input: entry, external: [/^react($|\/)/] },
    },
  })
  const results = Array.isArray(built) ? built : "output" in built ? [built] : []
  const code = results
    .flatMap((result) => result.output)
    .map((output) => (output.type === "chunk" ? output.code : ""))
    .join("\n")
  const packed = new Set(iconIdentityIds(code))
  assert.ok(packed.size > 0, "the component bundle lost the glyphs the component renders")
  assert.ok(
    packed.size * 4 < registry.size,
    `importing Dialog bundled ${packed.size} of the ${registry.size} pinned icon identities`,
  )
  assert.doesNotMatch(
    code,
    requestsArtwork,
    "shipped components must draw their geometry instead of requesting artwork",
  )
}

async function verifyHostStyles(context: ConsumerContext, options: LibraryOptions): Promise<void> {
  const {
    consumer,
    runner: { stream },
  } = context
  options.log("library: verifying the packed stylesheet against host styles")
  await stream(
    nodeExecutable,
    ["--test", toolingPath(context, "tests/e2e/library-host-css-coexistence.spec.mjs")],
    context.toolingRoot,
    {
      LIBRARY_HOST_CSS_CONSUMER_ROOT: consumer,
      LIBRARY_HOST_CSS_PACKAGE: context.packageName,
    },
  )
}

function prepareRscConsumer(context: ConsumerContext): string {
  const {
    temporary,
    archive,
    packageName,
    installedVersion,
    toolingVersion,
    runner: { run },
  } = context
  const rsc = path.join(temporary, "rsc")
  fs.cpSync(toolingPath(context, "tests/fixtures/library-rsc-consumer"), rsc, { recursive: true })
  for (const source of walkFiles(rsc, (file) => /\.(ts|tsx)$/.test(file))) {
    fs.writeFileSync(
      source,
      fs.readFileSync(source, "utf8").replaceAll("__PAGOPA_UI_PACKAGE__", packageName),
    )
  }
  fs.writeFileSync(
    path.join(rsc, "package.json"),
    JSON.stringify(
      {
        private: true,
        type: "module",
        dependencies: {
          [packageName]: `file:${archive}`,
          react: installedVersion("react"),
          "react-dom": installedVersion("react-dom"),
          next: toolingVersion("next"),
        },
        devDependencies: {
          "@types/node": installedVersion("@types/node"),
          "@types/react": installedVersion("@types/react"),
          "@types/react-dom": installedVersion("@types/react-dom"),
          // Next loads the TypeScript API from `lib/typescript.js`, which the
          // workspace's single compiler publishes.
          typescript: installedVersion("typescript"),
        },
      },
      null,
      2,
    ),
  )
  run(
    "pnpm",
    [
      "install",
      "--ignore-workspace",
      "--prefer-offline",
      "--ignore-scripts",
      "--reporter=append-only",
    ],
    rsc,
  )
  assertIsolatedInstall(rsc, [packageName, "react", "react-dom", "next", "typescript"])

  return rsc
}

const TSC_BINS = ["typescript/bin/tsc", "typescript/bin/tsc6"]

/** The compiler entry point the installed TypeScript ships; the name moved between releases. */
function resolveTsc(rscRequire: NodeJS.Require): string {
  for (const candidate of TSC_BINS) {
    try {
      return rscRequire.resolve(candidate)
    } catch {}
  }
  assert.fail(`the consumer TypeScript ships none of ${TSC_BINS.join(", ")}`)
}

function buildRscConsumer(
  context: ConsumerContext,
  rsc: string,
  consumerEnv: NodeJS.ProcessEnv,
): void {
  const {
    runner: { run },
  } = context
  const rscRequire = createRequire(path.join(rsc, "package.json"))
  const nextCli = rscRequire.resolve("next/dist/bin/next")
  buildNext(nextCli, rsc, consumerEnv)
  parseSchema(
    z.object({
      compilerOptions: z.object({ strict: z.literal(true), skipLibCheck: z.literal(true) }),
    }),
    JSON.parse(fs.readFileSync(path.join(rsc, "tsconfig.json"), "utf8")),
    "Next consumer TypeScript configuration",
  )
  run(nodeExecutable, [resolveTsc(rscRequire), "-p", "tsconfig.json"], rsc)
}

type PreviewServer = {
  httpServer: { close: (callback: (error?: Error) => void) => void }
  resolvedUrls?: { local: string[] } | null
}

async function closePreview(server: PreviewServer | undefined): Promise<void> {
  if (server) {
    await new Promise<void>((resolve, reject) =>
      server.httpServer.close((error) => (error ? reject(error) : resolve())),
    )
  }
}

async function verifyBrowsers(
  context: ConsumerContext,
  options: LibraryOptions,
  server: PreviewServer,
  nextServer: Awaited<ReturnType<typeof startNextServer>>,
  expectedIconVariants: number,
  expectedIconVariantIds: string[],
  expectedIconPaints: number,
): Promise<string> {
  const {
    runner: { stream },
  } = context
  const url = server?.resolvedUrls?.local[0]
  assert.ok(url, "consumer preview did not bind a local port")
  assert.equal((await fetch(url)).ok, true, "consumer preview is not responsive")
  // The Playwright test runner drives the browser sequence: one project per
  // engine, one retry for load-related flakiness, per-engine reporting. It runs
  // from the tooling package, which owns the spec and its runner.
  const engines = (options.env.LIBRARY_ENGINES?.trim() || "chromium,firefox,webkit")
    .split(",")
    .map((engine) => engine.trim())
    .join(", ")
  try {
    await stream(
      "pnpm",
      ["exec", "playwright", "test", "--config", toolingPath(context, "playwright.config.mjs")],
      context.toolingRoot,
      {
        CONSUMER_URL: url,
        NEXT_CONSUMER_URL: nextServer.url,
        EXPECTED_ICON_VARIANTS: String(expectedIconVariants),
        EXPECTED_ICON_VARIANT_IDS: expectedIconVariantIds.join(","),
        EXPECTED_ICON_PAINTS: String(expectedIconPaints),
      },
    )
  } catch (error) {
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}\nNext production server output:\n${nextServer.output()}`,
      { cause: error },
    )
  }

  return engines
}

function missingArtifacts(root: string): string[] {
  return [
    [file, `missing ${file} — run "pnpm build" first`],
    [typesFile, `missing ${typesFile} — type declarations were not emitted`],
  ]
    .filter(([relative]) => !fs.existsSync(path.join(root, relative)))
    .map(([, message]) => message)
}

function createConsumerContext(
  workspace: Workspace,
  options: LibraryOptions,
  packageName: string,
  audited: NodeRequire,
  tooling: NodeRequire,
): { context: ConsumerContext; consumerEnv: NodeJS.ProcessEnv } {
  const { root, toolingRoot } = workspace
  const version = (resolver: NodeRequire, name: string): string =>
    JSON.parse(fs.readFileSync(resolver.resolve(`${name}/package.json`), "utf8")).version
  // Chromium puts its singleton socket below TMPDIR; checkout paths exceed the
  // Unix socket limit on CI. Keep scratch outside the repository and short.
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-lib-"))
  const consumerEnv = { ...options.env, TMPDIR: temporary, TMP: temporary, TEMP: temporary }
  const context: ConsumerContext = {
    root,
    toolingRoot,
    temporary,
    consumer: path.join(temporary, "consumer"),
    archive: path.join(temporary, "pagopa-ui.tgz"),
    packageName,
    installedVersion: (name) => version(audited, name),
    toolingVersion: (name) => version(tooling, name),
    runner: createRunner(consumerEnv),
  }
  return { context, consumerEnv }
}

export async function checkLibrary(
  workspace: Workspace,
  options: LibraryOptions,
): Promise<CheckReport> {
  const { root, toolingRoot } = workspace
  const missing = missingArtifacts(root)
  if (missing.length) return report("library", "the built artifact", missing)
  const contract = verifyArtifactContract(workspace)
  const { manifest, expectedIconVariants, expectedIconVariantIds } = contract
  const audited = createRequire(path.join(root, "package.json"))
  const tooling = createRequire(path.join(toolingRoot, "package.json"))
  const { preview } = await import(pathToFileURL(audited.resolve("vite")).href)
  const { context, consumerEnv } = createConsumerContext(
    workspace,
    options,
    manifest.name,
    audited,
    tooling,
  )
  let server: PreviewServer | undefined
  let nextServer: Awaited<ReturnType<typeof startNextServer>> | undefined
  try {
    prepareConsumer(context)
    const imported = readPackedImport(context)
    validatePackedImport(imported)
    compileConsumer(context)
    await verifyTreeShakenIconBundle(context, audited, "feedback")
    await verifyComponentIconBundle(context, audited)
    await verifyHostStyles(context, options)
    const rsc = prepareRscConsumer(context)
    buildRscConsumer(context, rsc, consumerEnv)
    nextServer = await startNextServer(rsc, consumerEnv)
    const activeServer = await preview({
      root: context.consumer,
      configFile: path.join(context.consumer, "vite.config.mjs"),
      envDir: false,
      preview: { host: "127.0.0.1", port: 0, strictPort: true },
    })
    server = activeServer
    const engines = await verifyBrowsers(
      context,
      options,
      activeServer,
      nextServer,
      expectedIconVariants,
      expectedIconVariantIds,
      contract.expectedIconPaints,
    )
    const exportCount = imported.exports.length
    const summary = `isolated tarball, ${exportCount} exports, strict types, shared React, native forms, responsive Table/sorting/paging, mobile chrome bands/one-row header/no clipped actions, viewport and container device scopes (narrow-column module, scrollable-list first item, segmented fit), calendar confirmation/ranges, explicit Breadcrumb navigation, source ProductCard/native links/actions/reflow, source OTP/password/paste/native-length/reset/system-color paint, source Avatar/native images/selection/non-color statuses/unoccluded initials/font preferences/system-color paint, keyboard/focus, standalone CSS/fonts/artwork, single-icon and shipped-component tree-shaken bundles and host-style coexistence, Next.js App Router request-time SSR/hydration, provider messages and client routing in${engines}`
    return report("library", summary, [])
  } finally {
    try {
      await closePreview(server)
    } finally {
      try {
        await nextServer?.close()
      } finally {
        fs.rmSync(context.temporary, { recursive: true, force: true })
      }
    }
  }
}
