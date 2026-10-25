#!/usr/bin/env node
// Verify the actual packed artifact in an isolated application after `pnpm build`.
import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import fs from "node:fs"
import { createRequire } from "node:module"
import os from "node:os"
import path from "node:path"
import { z } from "zod"
import { pathToFileURL } from "node:url"
import { enterRoot, toolingPath, TOOLING_ROOT } from "../lib/paths.ts"
import { parseSchema } from "../lib/validate.ts"
import { FORBIDDEN_EXPORTS, REQUIRED_EXPORTS, verifyArtifactContract } from "./library-artifact.ts"

const file = "dist/pagopa-ui.js"
const typesFile = "dist/types/pagopa-ui.d.ts"

export async function runLibraryCheck(): Promise<number> {
  const root = enterRoot()
  if (!fs.existsSync(file)) {
    console.error(`missing ${file} — run "pnpm build" first`)
    return 1
  }
  if (!fs.existsSync(typesFile)) {
    console.error(`missing ${typesFile} — type declarations were not emitted`)
    return 1
  }

  const { manifest, expectedIconVariants, expectedIconVariantIds } = verifyArtifactContract(root)

  // Versions come from the audited package: its toolchain is the one the
  // consumer reproduces, not the tooling's own.
  const audited = createRequire(path.join(root, "package.json"))

  function run(command: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv): string {
    const result = spawnSync(command, args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      env: env ? { ...process.env, ...env } : process.env,
    })
    if (result.error) throw result.error
    assert.equal(
      result.status,
      0,
      `${command} ${args.join(" ")} failed:\n${result.stdout}${result.stderr}`,
    )
    return result.stdout
  }

  // Runs a command without blocking the event loop: the consumer preview server
  // lives in this process, so a synchronous spawn would starve the HTTP
  // responses the Playwright runner needs.
  async function runStreaming(
    command: string,
    args: string[],
    cwd: string,
    env?: NodeJS.ProcessEnv,
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        env: env ? { ...process.env, ...env } : process.env,
        stdio: "inherit",
      })
      child.on("error", reject)
      child.on("close", (code) => {
        if (code === 0) resolve()
        else reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`))
      })
    })
  }

  const ImportedPackageSchema = z.looseObject({
    exports: z.array(z.string()),
    undefinedExports: z.array(z.string()),
    sharedReact: z.boolean(),
    rendered: z.string(),
    renderedCalendar: z.string(),
    renderedProduct: z.string(),
    renderedAvatar: z.string(),
  })

  const installedVersion = (name: string): string =>
    JSON.parse(fs.readFileSync(audited.resolve(`${name}/package.json`), "utf8")).version
  const packageSpecifier = JSON.stringify(manifest.name)
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-library-"))
  const consumer = path.join(temporary, "consumer")
  // The preview server comes from the audited package's own Vite: the consumer is
  // built with that toolchain, so serving it with another copy would prove less.
  const { preview } = await import(pathToFileURL(audited.resolve("vite")).href)
  let server:
    | {
        httpServer: { close: (callback: (error?: Error) => void) => void }
        resolvedUrls?: { local: string[] } | null
      }
    | undefined
  try {
    const archive = path.join(temporary, "pagopa-ui.tgz")
    run("pnpm", ["pack", "--out", archive, "--json"], root)
    fs.cpSync(toolingPath("tests/fixtures/library-consumer"), consumer, { recursive: true })
    // The fixture names the package by placeholder so the workspace graph does
    // not read it as a dependency; the consumer imports the installed tarball.
    const entry = path.join(consumer, "main.tsx")
    fs.writeFileSync(
      entry,
      fs.readFileSync(entry, "utf8").replaceAll("__PAGOPA_UI_PACKAGE__", manifest.name),
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
            [manifest.name]: `file:${archive}`,
            react: installedVersion("react"),
            "react-dom": installedVersion("react-dom"),
          },
          devDependencies: {
            "@types/react": installedVersion("@types/react"),
            "@types/react-dom": installedVersion("@types/react-dom"),
            // The workspace runs TypeScript 7 through the `@typescript/native`
            // alias (the `typescript` name carries the TypeScript 6 API); the
            // consumer needs the 7 compiler only, so it installs it directly.
            typescript: `npm:typescript@${installedVersion("@typescript/native")}`,
            vite: installedVersion("vite"),
          },
        },
        null,
        2,
      ),
    )
    run(
      "pnpm",
      ["install", "--prefer-offline", "--ignore-scripts", "--reporter=append-only"],
      consumer,
    )
    for (const name of ["tailwindcss", "shadcn", "@tailwindcss/vite"]) {
      assert.equal(
        fs.existsSync(path.join(consumer, "node_modules", name)),
        false,
        `${name} leaked into the consumer`,
      )
    }

    const imported = parseSchema(
      ImportedPackageSchema,
      JSON.parse(
        run(
          process.execPath,
          [
            "--input-type=module",
            "-e",
            `
    import * as mod from ${packageSpecifier}
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
    assert.throws(
      () => renderToString(React.createElement(mod.PagoPAIcon, { name: "not-a-published-icon" })),
      /has no published source artwork/,
      "untyped consumers must not get a raw-name fallback",
    )
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
    console.log(JSON.stringify({
      exports: Object.keys(mod),
      undefinedExports: Object.keys(mod).filter((name) => typeof mod[name] === "undefined"),
      sharedReact: app.resolve("react") === library.resolve("react"),
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
  `,
          ],
          consumer,
        ),
      ),
      "packed import",
    )
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

    server = await preview({
      root: consumer,
      configFile: path.join(consumer, "vite.config.mjs"),
      envDir: false,
      preview: { host: "127.0.0.1", port: 0, strictPort: true },
    })
    const url = server?.resolvedUrls?.local[0]
    assert.ok(url, "consumer preview did not bind a local port")
    assert.equal((await fetch(url)).ok, true, "consumer preview is not responsive")
    // The Playwright test runner drives the browser sequence: one project per
    // engine, one retry for load-related flakiness, per-engine reporting. It runs
    // from the tooling package, which owns the spec and its runner.
    await runStreaming(
      "pnpm",
      ["exec", "playwright", "test", "--config", toolingPath("playwright.config.mjs")],
      TOOLING_ROOT,
      {
        CONSUMER_URL: url,
        EXPECTED_ICON_VARIANTS: String(expectedIconVariants),
        EXPECTED_ICON_VARIANT_IDS: expectedIconVariantIds.join(","),
      },
    )
    console.log(
      `library OK: isolated tarball, ${imported.exports.length} exports, strict types, shared React, native forms, responsive Table/sorting/paging, mobile chrome bands/one-row header/no clipped actions, viewport and container device scopes (narrow-column module, scrollable-list first item, segmented fit), calendar confirmation/ranges, explicit Breadcrumb navigation, source ProductCard/native links/actions/reflow, source OTP/password/paste/native-length/reset/system-color paint, source Avatar/native images/selection/non-color statuses/unoccluded initials/font preferences/system-color paint, keyboard/focus, standalone CSS/fonts/artwork in Chromium, Firefox and WebKit`,
    )
  } finally {
    const active = server
    if (active) {
      await new Promise<void>((resolve, reject) =>
        active.httpServer.close((error) => (error ? reject(error) : resolve())),
      )
    }
    fs.rmSync(temporary, { recursive: true, force: true })
  }
  return 0
}
