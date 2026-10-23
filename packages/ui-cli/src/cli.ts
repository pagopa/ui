#!/usr/bin/env node
// The single, discoverable entry point of the tooling. Every command keeps the
// implementation in its own module; citty owns the tree, the help and the
// argument surface, so a new command is discovered instead of documented twice.
import { defineCommand, runMain } from "citty"

import { runCssBudget } from "./checks/css-budget.ts"
import { runDocLinks } from "./checks/doc-links.ts"
import { runFoundation } from "./checks/foundation.ts"
import { runImportLayers } from "./checks/import-layers.ts"
import { runLibraryCheck } from "./checks/library.ts"
import { runPrepareTypes } from "./commands/prepare-types.ts"
import { cli as runDevices } from "./figma/devices.ts"
import { runExport } from "./figma/export.ts"
import { runIcons } from "./figma/icons.ts"
import { runPictograms } from "./figma/pictograms.ts"
import { runStories } from "./figma/stories.ts"
import { runSync } from "./figma/sync.ts"
import { runStatus } from "./figma/status.ts"
import { runTokens } from "./figma/tokens.ts"
import { main as runParity } from "./parity/cli.ts"
import { renderCli } from "./parity/render.ts"
import { sourceCli } from "./parity/source.ts"
import { runChanged } from "./test/changed.ts"
import { runCommand, UsageError } from "./lib/command.ts"

const inputArg = {
  type: "string",
  valueHint: "file",
  description: "Path to the pinned snapshot the command reads",
} as const

const jsonArg = {
  type: "boolean",
  default: false,
  description: "Print machine-readable JSON",
} as const

function execute(command: () => number | Promise<number>) {
  return async (): Promise<void> => {
    await runCommand(async () => command())
  }
}

function requireInput(value: unknown, command: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new UsageError(`${command} needs --input <file>`)
  }
  return value
}

function rawArguments(command: string): string[] {
  const raw = process.argv.slice(2)
  const index = raw.indexOf(command)
  return index >= 0 ? raw.slice(index + 1) : []
}

const layers = defineCommand({
  meta: { name: "layers", description: "Enforce the import-layer contract" },
  run: execute(() => runImportLayers()),
})

const foundation = defineCommand({
  meta: { name: "foundation", description: "Enforce the component class contract" },
  args: {
    measure: { type: "boolean", default: false, description: "Print the current counts" },
  },
  run: ({ args }) => execute(() => runFoundation(args.measure ? ["--measure"] : []))(),
})

const docs = defineCommand({
  meta: { name: "docs", description: "Resolve documentation links and path claims" },
  run: execute(() => runDocLinks()),
})

const css = defineCommand({
  meta: { name: "css", description: "Enforce the published stylesheet budget" },
  args: {
    measure: { type: "boolean", default: false, description: "Print the current sizes" },
    write: { type: "boolean", default: false, description: "Record the size you accept" },
  },
  run: ({ args }) => {
    const argv = args.write ? ["--write"] : args.measure ? ["--measure"] : []
    return execute(() => runCssBudget(argv))()
  },
})

const library = defineCommand({
  meta: { name: "library", description: "Verify the packed artifact in an isolated app" },
  run: execute(() => runLibraryCheck()),
})

const figmaCheck = defineCommand({
  meta: { name: "figma", description: "Validate the catalogue and the device vocabulary" },
  args: {
    input: inputArg,
    rest: { type: "boolean", default: false, description: "Read the live file over REST" },
    plan: { type: "boolean", default: false, description: "Print the plan without writing" },
    write: { type: "boolean", default: false, description: "Refresh the committed inventory" },
    triage: { type: "boolean", default: false, description: "Refresh and queue the delta" },
    "pr-body": { type: "string", valueHint: "file", description: "Write the drift PR body" },
    save: { type: "string", valueHint: "file", description: "Save the pinned REST snapshot" },
    delta: { type: "string", valueHint: "file", description: "Write the machine-readable delta" },
    "evidence-base": {
      type: "string",
      valueHint: "url",
      description: "Prefix for the raw evidence links in the body",
    },
  },
  run: ({ args }) => {
    const argv: string[] = []
    if (args.write) argv.push("--write")
    if (args.triage) argv.push("--triage")
    if (args.plan) argv.push("--plan")
    if (args.rest) argv.push("--rest")
    if (args.input) argv.push("--input", String(args.input))
    if (args["pr-body"]) argv.push("--pr-body", String(args["pr-body"]))
    if (args.save) argv.push("--save", String(args.save))
    if (args.delta) argv.push("--delta", String(args.delta))
    if (args["evidence-base"]) argv.push("--evidence-base", String(args["evidence-base"]))
    return execute(() => runSync(argv))()
  },
})

const tokensCheck = defineCommand({
  meta: { name: "check", description: "Validate the committed token manifest" },
  run: execute(() => runTokens(["--check"])),
})

const tokensWrite = defineCommand({
  meta: { name: "write", description: "Curate a pinned variable snapshot" },
  args: { input: inputArg },
  run: ({ args }) =>
    execute(() => runTokens(["--write", "--input", requireInput(args.input, "tokens write")]))(),
})

const tokens = defineCommand({
  meta: { name: "tokens", description: "Design-token manifest commands" },
  subCommands: { check: tokensCheck, write: tokensWrite },
})

const iconCheck = defineCommand({
  meta: { name: "check", description: "Validate the committed icon artwork" },
  args: { input: inputArg },
  run: ({ args }) =>
    execute(() =>
      runIcons(args.input ? ["--check", "--input", String(args.input)] : ["--check"]),
    )(),
})

const iconWrite = defineCommand({
  meta: { name: "write", description: "Generate icon artwork from a pinned snapshot" },
  args: { input: { ...inputArg, required: true } },
  run: ({ args }) =>
    execute(() =>
      runIcons(["--write", "--input", requireInput(args.input, "assets icons write")]),
    )(),
})

const icons = defineCommand({
  meta: { name: "icons", description: "Icon artwork commands" },
  subCommands: { check: iconCheck, write: iconWrite },
})

const pictogramCheck = defineCommand({
  meta: { name: "check", description: "Validate the committed pictogram artwork" },
  args: { input: inputArg },
  run: ({ args }) =>
    execute(() =>
      runPictograms(args.input ? ["--check", "--input", String(args.input)] : ["--check"]),
    )(),
})

const pictogramWrite = defineCommand({
  meta: { name: "write", description: "Import pictogram artwork from a pinned snapshot" },
  args: { input: { ...inputArg, required: true } },
  run: ({ args }) =>
    execute(() =>
      runPictograms(["--write", "--input", requireInput(args.input, "assets pictograms write")]),
    )(),
})

const pictogramExport = defineCommand({
  meta: { name: "export", description: "Render individual pictogram variants" },
  args: { input: { ...inputArg, required: true } },
  run: ({ args }) =>
    execute(() =>
      runPictograms(["--export", "--input", requireInput(args.input, "assets pictograms export")]),
    )(),
})

const pictograms = defineCommand({
  meta: { name: "pictograms", description: "Pictogram artwork commands" },
  subCommands: {
    check: pictogramCheck,
    write: pictogramWrite,
    export: pictogramExport,
  },
})

const assets = defineCommand({
  meta: { name: "assets", description: "Icon and pictogram artwork commands" },
  subCommands: { icons, pictograms },
})

const check = defineCommand({
  meta: { name: "check", description: "Run one of the repository contracts" },
  subCommands: {
    layers,
    foundation,
    docs,
    css,
    library,
    figma: figmaCheck,
    tokens: tokensCheck,
    icons: iconCheck,
    pictograms: pictogramCheck,
    assets: defineCommand({
      meta: { name: "assets", description: "Run both artwork checks" },
      run: execute(async () => {
        const iconsCode = await runIcons(["--check"])
        const pictogramsCode = await runPictograms(["--check"])
        return iconsCode || pictogramsCode
      }),
    }),
  },
})

const figmaSync = defineCommand({
  meta: { name: "sync", description: "Validate, refresh or triage the Figma catalogue" },
  args: {
    input: inputArg,
    rest: { type: "boolean", default: false, description: "Read the live file over REST" },
    write: { type: "boolean", default: false, description: "Refresh the committed inventory" },
    triage: { type: "boolean", default: false, description: "Refresh and queue the delta" },
    plan: { type: "boolean", default: false, description: "Print the plan without writing" },
    "pr-body": { type: "string", valueHint: "file", description: "Write the drift PR body" },
    save: { type: "string", valueHint: "file", description: "Save the pinned REST snapshot" },
    delta: { type: "string", valueHint: "file", description: "Write the machine-readable delta" },
    "evidence-base": {
      type: "string",
      valueHint: "url",
      description: "Prefix for the raw evidence links in the body",
    },
  },
  run: ({ args }) => {
    const argv: string[] = []
    if (args.write) argv.push("--write")
    if (args.triage) argv.push("--triage")
    if (args.plan) argv.push("--plan")
    if (args.rest) argv.push("--rest")
    if (args.input) argv.push("--input", String(args.input))
    if (args["pr-body"]) argv.push("--pr-body", String(args["pr-body"]))
    if (args.save) argv.push("--save", String(args.save))
    if (args.delta) argv.push("--delta", String(args.delta))
    if (args["evidence-base"]) argv.push("--evidence-base", String(args["evidence-base"]))
    return execute(() => runSync(argv))()
  },
})

const figmaExport = defineCommand({
  meta: { name: "export", description: "Write the read-only REST snapshot" },
  args: { input: inputArg },
  run: ({ args }) => execute(() => runExport(args.input ? ["--input", String(args.input)] : []))(),
})

const figmaDevices = defineCommand({
  meta: { name: "devices", description: "Resolve the committed device vocabulary" },
  args: {
    check: { type: "boolean", default: false, description: "Fail on an invalid policy" },
    json: jsonArg,
  },
  run: ({ args }) => {
    const argv: string[] = []
    if (args.check) argv.push("--check")
    if (args.json) argv.push("--json")
    return execute(() => runDevices(argv))()
  },
})

const figmaStories = defineCommand({
  meta: {
    name: "stories",
    description: "Commit or check the Storybook titles of the mapped stories",
  },
  args: {
    write: { type: "boolean", default: false, description: "Write the committed map" },
  },
  run: ({ args }) => execute(() => runStories(args.write ? ["--write"] : []))(),
})

const figmaStatus = defineCommand({
  meta: { name: "status", description: "Report the token, snapshot, drift and pending queue" },
  args: {
    json: jsonArg,
    live: {
      type: "boolean",
      default: false,
      description: "Ask the live file for its version and last-modified date",
    },
  },
  run: ({ args }) => {
    const argv: string[] = []
    if (args.json) argv.push("--json")
    if (args.live) argv.push("--live")
    return execute(() => runStatus(argv))()
  },
})

const figma = defineCommand({
  meta: { name: "figma", description: "Figma catalogue and artwork commands" },
  subCommands: {
    status: figmaStatus,
    sync: figmaSync,
    export: figmaExport,
    devices: figmaDevices,
    stories: figmaStories,
    tokens,
    ...assets.subCommands,
  },
})

const parityString = { type: "string" } as const
const parityBoolean = { type: "boolean", default: false } as const

type ParityArg = typeof parityString | typeof parityBoolean

const parityCommand = (name: string, description: string, args: Record<string, ParityArg> = {}) =>
  defineCommand({
    meta: { name, description },
    args,
    run: execute(() => runParity([name, ...rawArguments(name)])),
  })

const parity = defineCommand({
  meta: { name: "parity", description: "Visual-parity commands" },
  subCommands: {
    queue: parityCommand("queue", "Work list of registry cases", {
      status: parityString,
      node: parityString,
      cases: parityString,
      unmapped: parityBoolean,
      coverage: parityBoolean,
      uncovered: parityBoolean,
      json: parityBoolean,
    }),
    check: parityCommand("check", "Compare one reviewed case", {
      node: parityString,
      case: parityString,
      cases: parityString,
      input: parityString,
      state: parityString,
      variant: parityString,
      device: parityString,
      "layout-scope": parityString,
      story: parityString,
      width: parityString,
      root: parityString,
      "offset-origin": parityString,
      "subject-root": parityString,
      subject: parityString,
      fill: parityString,
      click: parityString,
      focus: parityString,
      blur: parityBoolean,
      "keep-focus": parityBoolean,
      "expect-state": parityString,
      "state-evidence": parityString,
      "compare-text": parityBoolean,
      "compare-box": parityString,
      "compare-offset": parityString,
      interactive: parityBoolean,
      strict: parityBoolean,
      "save-case": parityBoolean,
      note: parityString,
      residue: parityString,
      ignore: parityString,
      viewport: parityString,
      height: parityString,
      screenshot: parityString,
      depth: parityString,
      notes: parityBoolean,
      json: parityBoolean,
      devices: parityBoolean,
    }),
    capture: parityCommand("capture", "Run a parity wave", {
      cases: parityString,
      status: parityString,
      node: parityString,
      device: parityString,
      note: parityString,
      limit: parityString,
      "include-catalogue": parityBoolean,
      out: parityString,
      strict: parityBoolean,
      "dry-run": parityBoolean,
    }),
    report: parityCommand("report", "Aggregate a wave directory", {
      wave: parityString,
      dir: parityString,
      out: parityString,
    }),
    cases: parityCommand("cases", "Propose the missing device cases", {
      sync: parityBoolean,
      node: parityString,
      "dry-run": parityBoolean,
      cases: parityString,
    }),
    verify: parityCommand("verify", "Verify the case corpus and device coverage", {
      cases: parityString,
      json: parityBoolean,
    }),
    evidence: parityCommand("evidence", "Write or check the offline evidence bundle", {
      write: parityBoolean,
      check: parityBoolean,
      input: parityString,
    }),
    source: defineCommand({
      meta: { name: "source", description: "Print the pinned source spec" },
      args: {
        nodeId: { type: "positional", required: true },
        input: parityString,
        depth: parityString,
        json: parityBoolean,
        compact: parityBoolean,
        png: parityBoolean,
      },
      run: execute(async () => {
        await sourceCli(rawArguments("source"))
        return 0
      }),
    }),
    render: defineCommand({
      meta: { name: "render", description: "Probe one Storybook story" },
      args: {
        story: parityString,
        width: parityString,
        viewport: parityString,
        height: parityString,
        root: parityString,
        subject: parityString,
        "offset-origin": parityString,
        fill: parityString,
        click: parityString,
        focus: parityString,
        blur: parityBoolean,
        "keep-focus": parityBoolean,
        "expect-state": parityString,
        "state-evidence": parityString,
        screenshot: parityString,
        tree: parityBoolean,
        depth: parityString,
        json: parityBoolean,
      },
      run: execute(() => {
        renderCli(rawArguments("render"))
        return 0
      }),
    }),
  },
})

const testChanged = defineCommand({
  meta: { name: "changed", description: "Run only the tests affected since the last pass" },
  args: {
    coverage: { type: "boolean", default: false, description: "Run the coverage pass" },
    all: { type: "boolean", default: false, description: "Run every test file" },
    since: { type: "string", valueHint: "ref", description: "Use an explicit git ref" },
  },
  run: execute(() => runChanged(rawArguments("changed"))),
})

const test = defineCommand({
  meta: { name: "test", description: "Test-runner commands" },
  subCommands: { changed: testChanged },
})

const prepareTypes = defineCommand({
  meta: { name: "prepare-types", description: "Make the emitted declarations alias-free ESM" },
  run: execute(() => runPrepareTypes()),
})

const main = defineCommand({
  meta: {
    name: "ui-cli",
    version: "0.0.0",
    description: "The UI CLI, checks and Figma tooling of the PagoPA design system",
  },
  subCommands: {
    check,
    figma,
    tokens,
    assets,
    parity,
    test,
    "prepare-types": prepareTypes,
  },
})

runMain(main)
