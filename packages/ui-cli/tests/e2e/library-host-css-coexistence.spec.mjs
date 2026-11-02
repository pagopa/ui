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
    server: { host: "127.0.0.1", port: 0, strictPort: true, fs: { allow: [consumerRoot] } },
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

// The library stylesheet loads before the host one, so the host wins every
// tie that scoping does not settle.
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
          await addLibraryStylesheet(page, consumer.cssUrl)

          assert.deepEqual(await measureHost(page), before, "library CSS must not restyle the host")

          const [action, overridden] = await Promise.all(
            ["library-action", "overridden-action"].map((id) =>
              page.getByTestId(id).evaluate((element) => {
                const style = getComputedStyle(element)
                return { background: style.backgroundColor, font: style.fontFamily }
              }),
            ),
          )
          assert.equal(action.background, "rgb(11, 62, 227)", "library utilities beat host rules")
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
          assert.deepEqual(popup, {
            inPortalRoot: true,
            background: "rgb(255, 255, 255)",
            paddingTop: "24px",
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
