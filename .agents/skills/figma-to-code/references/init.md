# Init — the config and the token preflight

**Done when** `figma-to-code.yaml` exists beside the package it describes, every
committed path it names exists, and the token preflight has been run (pass or a
relayed failure).

## 1. The config

1. **Exists?** Find it with `git ls-files '*figma-to-code.yaml'` and read it.
   When it exists, run `pnpm nx run pagopa-ui:docs`: it fails on a committed
   path the config names that does not exist and on every command that does not
   resolve, and it reports where. Green → go to the preflight.
2. **Propose the paths.** Start from the defaults below and look for the real
   files (`glob` for `**/inventory.json`, `**/registry.json`,
   `**/parity-cases.json`, `**/device-policy.json`, `**/manifest.json`, the
   public entry the `package.json` `exports` names). Keep a default when the
   file is there.
3. **Agree.** In an interactive session, show the proposal grouped by section
   and ask the person to confirm or correct each group. In a non-interactive
   session, write the proposal as is and list in the report every default that
   was not found on disk.
4. **Write** the file, then run `pnpm nx run pagopa-ui:docs`.

| Key                          | What it is                                                            | Default                                     |
| ---------------------------- | --------------------------------------------------------------------- | ------------------------------------------- |
| `figma.fileModule`           | `FIGMA_FILE_KEY`, `figmaNodeUrl()`, `figmaEmbedUrl()`                 | `src/catalog/figma/file.ts`                 |
| `figma.snapshot`             | pinned REST export, local, gitignored                                 | `.figma/live-rest.json`                     |
| `figma.mcpInventory`         | MCP component list saved for the export                               | `.figma/live-mcp.json`                      |
| `figma.variables`            | local export of the published Variables                               | `.figma/variables.json`                     |
| `figma.parityOut`            | wave captures, probes and PNGs, gitignored                            | `.figma/parity`                             |
| `catalog.inventory`          | generated identities, contracts, fingerprints, dependency edges       | `src/catalog/figma/inventory.json`          |
| `catalog.registry`           | the decision per `nodeId`, page rules, targets, notes                 | `src/catalog/figma/registry.json`           |
| `catalog.parityCases`        | the reviewed case corpus                                              | `src/catalog/figma/parity-cases.json`       |
| `catalog.devicePolicy`       | the device vocabulary                                                 | `src/catalog/figma/device-policy.json`      |
| `catalog.deviceExceptions`   | reasoned missing-device exceptions, must shrink                       | `src/catalog/figma/device-exceptions.json`  |
| `catalog.apiExceptions`      | public exports with no source mapping, each with a reason             | `src/catalog/figma/api-exceptions.json`     |
| `catalog.evidenceExceptions` | story-evidence exceptions, must shrink                                | `src/catalog/figma/evidence-exceptions.json`|
| `catalog.inventoryStory`     | the rendered join of inventory and registry                           | `apps/storybook/src/FigmaInventory.stories.tsx`    |
| `catalog.rules`              | the English record of every consolidated `.Regole` card                | `src/catalog/figma/rules.json`              |
| `tokens.manifest`            | every Figma variable, exclusion and reason                            | `packages/tokens/src/manifest.json`                  |
| `tokens.generatedCss`        | the generated CSS foundation layer                                    | `packages/tokens/src/figma.generated.css`            |
| `tokens.stylesheet`          | semantic aliases and local extensions                                 | `src/index.css`                             |
| `artwork.iconManifest`       | icon identities, variants, provenance                                 | `packages/artwork/src/assets/figma-icons/manifest.json`      |
| `artwork.iconModule`         | generated runtime icon map                                            | `packages/artwork/src/components/icons/icon-assets.ts`       |
| `artwork.pictogramManifest`  | pictogram variants, fingerprints, checksums, provenance               | `packages/artwork/src/assets/figma-pictograms/manifest.json` |
| `artwork.pictogramModule`    | generated runtime pictogram map                                       | `packages/artwork/src/components/icons/pictogram-assets.ts`  |
| `code.components`            | component families                                                    | `src/components`                            |
| `code.publicEntry`           | the public entry point                                                | `src/pagopa-ui.ts`                          |
| `code.stories`               | Storybook stories, the parity capture surface                         | `apps/storybook/src`                               |
| `code.guides`                | component guides rendered on the docs pages                           | `apps/storybook/src/guides`                        |
| `storybook.url`              | the Storybook the parity tools capture                                | `http://localhost:6006`                     |

The scripts under `packages/ui-cli/` read these same defaults. A path the config moves
must also move where a script reads it: pass it where the script takes a flag
(`--cases`, `--input`, `--out`), otherwise change the script in the same pull
request. A Storybook on another port is passed as
`STORYBOOK_URL=<url>` to the parity commands.

## 2. The token preflight

Only the live steps (plan/export, triage against a fresh library, pictogram
export) need the token; everything else reads the pinned snapshot. The preflight
is the session report:

```bash
pnpm nx run pagopa-ui-cli:figma:status
```

`token present` clears the live steps. A missing, empty or whitespace-containing
token prints its guidance instead: relay it, and keep the offline use cases on
the pinned snapshot. The person exports the token in the shell that runs the
session and restarts it, or runs the live command themselves and hands over its
JSON output. Then wait for it, or continue with the offline use cases.
