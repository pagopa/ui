/// <reference types="vitest/config" />
import path from "node:path"
import fs from "node:fs"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { fileURLToPath } from "node:url"
import manifest from "./package.json" with { type: "json" }

const dirname = path.dirname(fileURLToPath(import.meta.url))
const externalPackages = Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies })

// The library build and the unit project. The stories and their browser
// projects live in apps/storybook, which documents this package.
export default defineConfig(() => ({
  base: "./",
  envDir: false,
  optimizeDeps: { include: ["@base-ui/react/combobox"] },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "bundled-font-licenses",
      apply: "build",
      buildStart() {
        for (const [fileName, source] of [
          ["licenses/titillio.txt", "src/assets/fonts/titillio/LICENSE.txt"],
          ["licenses/artwork.txt", "src/assets/artwork-provenance.txt"],
          // The public token block on its own, for a consumer that renders
          // beside the library without loading the component stylesheet.
          ["tokens.css", "../tokens/src/tokens.generated.css"],
        ] as const) {
          this.emitFile({
            type: "asset",
            fileName,
            source: fs.readFileSync(path.join(dirname, source), "utf8"),
          })
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  build: {
    assetsDir: "",
    // The build entry adds CSS; declarations come from the CSS-free public entry.
    lib: {
      entry: {
        "library-entry": path.resolve(dirname, "src/library-entry.ts"),
        tokens: path.resolve(dirname, "src/tokens.ts"),
      },
      formats: ["es"],
      fileName: (_, entryName) => `${entryName}.js`,
      cssFileName: "styles",
    },
    sourcemap: true,
    rollupOptions: {
      external: (id) => externalPackages.some((name) => id === name || id.startsWith(`${name}/`)),
      output: {
        // One ES module per source module: a consumer bundler keeps the client
        // boundary of each module instead of pulling one large file.
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: (chunk) => (chunk.name === "library-entry" ? "pagopa-ui.js" : "[name].js"),
      },
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.unit.test.ts"],
          environment: "node",
        },
      },
    ],
  },
}))
