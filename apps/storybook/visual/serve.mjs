import { createReadStream, statSync } from "node:fs"
import { createServer } from "node:http"
import { extname, join, normalize, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(fileURLToPath(new URL("../dist", import.meta.url)))
const port = Number(process.env.VISUAL_PORT ?? 6201)

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8", ...headers })
  res.end(body)
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost")
  const requested = decodeURIComponent(url.pathname)
  const target = normalize(join(root, requested === "/" ? "index.html" : requested))

  if (target !== root && !target.startsWith(root + sep)) {
    send(res, 403, "Forbidden")
    return
  }

  let file = target
  try {
    if (statSync(file).isDirectory()) file = join(file, "index.html")
    if (!statSync(file).isFile()) {
      send(res, 404, "Not found")
      return
    }
  } catch {
    send(res, 404, "Not found")
    return
  }

  res.writeHead(200, {
    "content-type": contentTypes[extname(file).toLowerCase()] ?? "application/octet-stream",
  })
  createReadStream(file).pipe(res)
}).listen(port, () => {
  console.log(`Serving ${root} on http://localhost:${port}`)
})
