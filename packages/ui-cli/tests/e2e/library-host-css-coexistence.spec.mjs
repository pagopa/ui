// The library check supplies a real tarball installed by pnpm. The host fixture
// lives under that consumer so its imports resolve through the same local peers.
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import test from "node:test"
import { fileURLToPath, pathToFileURL } from "node:url"
import { chromium, firefox, webkit } from "playwright"

const toolingRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const fixtureRoot = path.join(toolingRoot, "tests/fixtures/library-host-css-coexistence")
const engines = { chromium, firefox, webkit }

async function startConsumer(work, consumerRoot, packageName) {
  const app = path.join(work, "app")
  fs.mkdirSync(app, { recursive: true })
  for (const file of ["index.html", "host.css", "consumer.jsx"]) {
    const source = fs.readFileSync(path.join(fixtureRoot, file), "utf8")
    fs.writeFileSync(path.join(app, file), source.replaceAll("__PAGOPA_UI_PACKAGE__", packageName))
  }
  const consumer = createRequire(path.join(consumerRoot, "package.json"))
  const installed = fs.realpathSync(
    path.join(consumerRoot, "node_modules", ...packageName.split("/")),
  )
  const manifest = JSON.parse(fs.readFileSync(path.join(installed, "package.json"), "utf8"))
  const css = path.resolve(installed, manifest.exports["./styles.css"])
  const dist = path.dirname(css)
  const { createServer } = await import(pathToFileURL(consumer.resolve("vite")).href)
  const server = await createServer({
    root: app,
    configFile: false,
    envDir: false,
    cacheDir: path.join(work, "vite-cache"),
    logLevel: "error",
    plugins: [
      {
        name: "serve-packed-stylesheet",
        configureServer(viteServer) {
          viteServer.middlewares.use("/__packed/", (request, response, next) => {
            const relative = decodeURIComponent(new URL(request.url, "http://localhost").pathname)
            const file = path.resolve(dist, `.${relative}`)
            if (!file.startsWith(`${dist}${path.sep}`) || !fs.existsSync(file)) return next()
            response.setHeader("Content-Type", file.endsWith(".css") ? "text/css" : "font/woff2")
            response.end(fs.readFileSync(file))
          })
        },
      },
    ],
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: true,
      // Vite compares real paths: on macOS the temporary consumer is reached
      // through /var while its real path starts with /private/var.
      fs: { allow: [...new Set([consumerRoot, fs.realpathSync(consumerRoot)])] },
    },
  })
  await server.listen()
  const url = `http://127.0.0.1:${server.httpServer.address().port}`
  return { server, url, cssUrl: `${url}/__packed/${path.basename(css)}` }
}

function measureHost(page) {
  return page.evaluate(() => {
    const body = getComputedStyle(document.body)
    const heading = getComputedStyle(document.getElementById("host-heading"))
    const utility = getComputedStyle(document.getElementById("host-utility"))
    return {
      bodyMargin: body.marginTop,
      bodyBackground: body.backgroundColor,
      headingFont: heading.fontFamily,
      headingSize: heading.fontSize,
      utilityPadding: utility.paddingTop,
    }
  })
}

// Legacy markup a host migrated as-is: it sits inside the provider root but is
// not a library component, so it keeps its own typography, margins and box model.
function measureLegacy(page) {
  return page.evaluate(() => {
    const style = (id) => getComputedStyle(document.getElementById(id))
    const screen = style("legacy-screen")
    const heading = style("legacy-heading")
    const paragraph = style("legacy-paragraph")
    const list = style("legacy-list")
    const action = style("legacy-action")
    return {
      boxSizing: screen.boxSizing,
      headingSize: heading.fontSize,
      headingWeight: heading.fontWeight,
      headingMargin: heading.marginTop,
      paragraphMargin: paragraph.marginTop,
      listStyle: list.listStyleType,
      listPadding: list.paddingInlineStart,
      actionBackground: action.backgroundColor,
      actionBorder: action.borderTopWidth,
      actionFontSize: action.fontSize,
      muiBackground: style("mui-action").backgroundColor,
      utilityPadding: style("legacy-utility").paddingTop,
    }
  })
}

// The packed stylesheet itself, read from the installed tarball: the cascade
// contract is a property of the artifact, so it is checked without a browser.
function packedStylesheet(consumerRoot, packageName) {
  const installed = fs.realpathSync(
    path.join(consumerRoot, "node_modules", ...packageName.split("/")),
  )
  const manifest = JSON.parse(fs.readFileSync(path.join(installed, "package.json"), "utf8"))
  return fs.readFileSync(path.resolve(installed, manifest.exports["./styles.css"]), "utf8")
}

function layerBlock(css, name) {
  const open = `@layer ${name}{`
  const start = css.indexOf(open)
  assert.notEqual(start, -1, `the packed stylesheet must open @layer ${name}`)
  let depth = 0
  for (let index = start + open.length - 1; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1
    if (css[index] === "}") depth -= 1
    if (depth === 0) return { start, body: css.slice(start + open.length, index) }
  }
  return assert.fail(`@layer ${name} is not closed`)
}

// The built stylesheet must not depend on @scope: Firefox ESR and Safari before
// 17.4 drop the whole block, which would render a component unstyled.
async function countScopeRules(page) {
  return page.evaluate(() => {
    let found = 0
    const visit = (rules) => {
      for (const rule of rules) {
        if (rule.constructor.name === "CSSScopeRule") found += 1
        if (rule.cssRules) visit(rule.cssRules)
      }
    }
    for (const sheet of document.styleSheets) {
      try {
        visit(sheet.cssRules)
      } catch {
        // A cross-origin sheet cannot be inspected and is not the packed one.
      }
    }
    return found
  })
}

// The library stylesheet loads before the host one, and the host keeps its own
// layers, so the host wins every tie the cascade layers settle.
async function addLibraryStylesheet(page, cssUrl) {
  await page.evaluate(async (href) => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = href
    const loaded = new Promise((resolve, reject) => {
      link.onload = resolve
      link.onerror = reject
    })
    document.head.prepend(link)
    await loaded
    await document.fonts.ready
  }, cssUrl)
}

test("packed CSS leaves the host page alone and styles its own trees", async (t) => {
  const consumerRoot = process.env.LIBRARY_HOST_CSS_CONSUMER_ROOT
  const packageName = process.env.LIBRARY_HOST_CSS_PACKAGE
  assert.ok(
    consumerRoot && path.isAbsolute(consumerRoot) && packageName,
    "the host CSS test requires the installed tarball consumer from pagopa-ui:library:check",
  )
  const requested = (process.env.LIBRARY_ENGINES?.trim() || "chromium,firefox,webkit")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
  for (const name of requested) {
    assert.ok(Object.hasOwn(engines, name), `unknown browser engine: ${name}`)
  }

  await t.test("the packed stylesheet declares its layers", () => {
    const css = packedStylesheet(consumerRoot, packageName)
    assert.equal(css.includes("@scope"), false, "the packed stylesheet must not rely on @scope")
    const base = layerBlock(css, "pagopa-ui.base")
    const utilities = layerBlock(css, "pagopa-ui.utilities")
    assert.ok(base.start < utilities.start, "resets must be ordered before the utilities")
    assert.deepEqual(
      [...css.matchAll(/@layer ([^{;]+)\{/g)].map((match) => match[1]).sort(),
      ["pagopa-ui.base", "pagopa-ui.utilities", "properties"],
      "the artifact opens the two library layers and Tailwind's property fallback, nothing else",
    )
    // A reset reachable only through a zero-specificity `:where()` leaves a
    // consumer class of equal specificity free to override it.
    const roots = [...base.body.matchAll(/\[data-slot/g)]
    assert.ok(roots.length > 0, "the resets must reach the component roots")
    for (const match of roots) {
      assert.equal(
        base.body.slice(match.index - 7, match.index),
        ":where(",
        "every component-root reset must be wrapped in :where()",
      )
    }
  })

  const work = path.join(consumerRoot, `.host-css-${randomUUID()}`)
  fs.mkdirSync(work)
  let server
  try {
    const consumer = await startConsumer(work, consumerRoot, packageName)
    server = consumer.server
    for (const name of requested) {
      await t.test(name, async () => {
        const browser = await engines[name].launch({ headless: true })
        try {
          const page = await browser.newPage({
            viewport: { width: 1024, height: 768 },
            reducedMotion: "reduce",
          })
          const errors = []
          page.on("pageerror", (error) => errors.push(error.message))
          await page.goto(consumer.url)
          await page.getByTestId("library-action").waitFor()
          const before = await measureHost(page)
          const legacyBefore = await measureLegacy(page)
          await addLibraryStylesheet(page, consumer.cssUrl)

          assert.deepEqual(await measureHost(page), before, "library CSS must not restyle the host")
          // Guard the fixture: these are the browser defaults the resets would eat.
          assert.equal(legacyBefore.paragraphMargin, "16px")
          assert.equal(legacyBefore.listStyle, "disc")
          assert.equal(legacyBefore.boxSizing, "content-box")
          assert.equal(legacyBefore.utilityPadding, "5px")
          assert.deepEqual(
            await measureLegacy(page),
            legacyBefore,
            "library CSS must not reset legacy host markup inside the provider",
          )

          assert.equal(
            await countScopeRules(page),
            0,
            "the packed stylesheet must not rely on @scope",
          )

          const [action, overridden] = await Promise.all(
            ["library-action", "overridden-action"].map((id) =>
              page.getByTestId(id).evaluate((element) => {
                const style = getComputedStyle(element)
                return {
                  background: style.backgroundColor,
                  font: style.fontFamily,
                  paddingLeft: style.paddingLeft,
                }
              }),
            ),
          )

          assert.equal(action.background, "rgb(11, 62, 227)", "library utilities beat host rules")
          assert.equal(
            action.paddingLeft,
            "24px",
            "library utilities apply inside library components",
          )
          assert.match(action.font, /Titillio/)
          assert.equal(overridden.background, "rgb(1, 2, 3)", "consumer inline styles still win")

          await page.getByTestId("dialog-trigger").click()
          const dialog = page.getByRole("dialog", { name: "Example dialog" })
          await dialog.waitFor()
          const popup = await dialog.evaluate((element) => {
            const style = getComputedStyle(element)
            return {
              inPortalRoot: element.closest("body > [data-pagopa-ui-portal-root]") !== null,
              background: style.backgroundColor,
              paddingTop: style.paddingTop,
            }
          })
          // The host layers are declared after the library ones, so the host's
          // `.p-6` also wins on the dialog body: the library never outranks a
          // host layer, which is the price of not restyling the host.
          assert.deepEqual(popup, {
            inPortalRoot: true,
            background: "rgb(255, 255, 255)",
            paddingTop: "5px",
          })
          assert.deepEqual(errors, [])
        } finally {
          await browser.close()
        }
      })
    }
  } finally {
    await server?.close()
    fs.rmSync(work, { recursive: true, force: true })
  }
})
