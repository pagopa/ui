// Legacy groups retained until their dedicated domain migrations.
import { defineCommand } from "citty"

import { runBrief } from "../figma/brief.ts"
import { runComments } from "../figma/comments.ts"
import { runRules } from "../figma/rules.ts"
import { main as runParity } from "../parity/cli.ts"
import { renderCli } from "../parity/render.ts"
import { sourceCli } from "../parity/source.ts"
import { runChanged } from "../test/changed.ts"
import { runVisual } from "../test/visual.ts"
import { exitCodeOf } from "../lib/command.ts"
import type { CliContext } from "./context.ts"

function execute(ctx: CliContext, command: () => number | Promise<number>) {
  return async (): Promise<void> => {
    try {
      ctx.exitCode = await command()
    } catch (error) {
      ctx.io.err(`error: ${error instanceof Error ? error.message : String(error)}`)
      if (ctx.env.DEBUG && error instanceof Error && error.stack) ctx.io.err(error.stack)
      ctx.exitCode = exitCodeOf(error)
    }
  }
}

function rawArguments(command: string): string[] {
  const raw = process.argv.slice(2)
  const index = raw.indexOf(command)
  return index >= 0 ? raw.slice(index + 1) : []
}

export function legacyChecks(_ctx: CliContext): Record<string, never> {
  return {}
}

export function legacyFigmaSubCommands(ctx: CliContext) {
  const figmaRules = defineCommand({
    meta: { name: "rules", description: "Read, record and check the component rules boxes" },
    run: execute(ctx, () => runRules(rawArguments("rules"))),
  })

  const figmaComments = defineCommand({
    meta: { name: "comments", description: "Read the node comments of the file" },
    run: execute(ctx, () => runComments(rawArguments("comments"))),
  })

  const figmaBrief = defineCommand({
    meta: { name: "brief", description: "Print the implementation brief of a node" },
    run: execute(ctx, () => runBrief(rawArguments("brief"))),
  })

  return {
    rules: figmaRules,
    comments: figmaComments,
    brief: figmaBrief,
  }
}

const parityString = { type: "string" } as const
const parityBoolean = { type: "boolean", default: false } as const

type ParityArg = typeof parityString | typeof parityBoolean

function legacyCommands(ctx: CliContext) {
  const parityCommand = (name: string, description: string, args: Record<string, ParityArg> = {}) =>
    defineCommand({
      meta: { name, description },
      args,
      run: execute(ctx, () => runParity([name, ...rawArguments(name)])),
    })

  const parity = defineCommand({
    meta: { name: "parity", description: "Visual-parity commands" },
    subCommands: {
      queue: parityCommand("queue", "Work list of registry cases", {
        status: parityString,
        node: parityString,
        cases: parityString,
        order: parityString,
        unmapped: parityBoolean,
        coverage: parityBoolean,
        uncovered: parityBoolean,
        json: parityBoolean,
      }),
      align: parityCommand("align", "One node's read-only work order", {
        node: parityString,
        cases: parityString,
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
        saved: parityBoolean,
        input: parityString,
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
        run: execute(ctx, async () => {
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
        run: execute(ctx, () => {
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
    run: execute(ctx, () => runChanged(rawArguments("changed"))),
  })

  const testVisual = defineCommand({
    meta: { name: "visual", description: "Scope the visual-regression run to the change" },
    args: {
      since: {
        type: "string",
        valueHint: "ref",
        description: "The ref the change is measured against",
      },
      all: { type: "boolean", default: false, description: "Capture every story" },
      index: { type: "string", valueHint: "file", description: "The built Storybook index" },
      out: { type: "string", valueHint: "file", description: "Write the scope as JSON" },
      json: { type: "boolean", default: false, description: "Print the scope as JSON" },
      "check-baselines": {
        type: "boolean",
        default: false,
        description: "Require every scoped Linux baseline",
      },
    },
    run: execute(ctx, () => runVisual(rawArguments("visual"))),
  })

  const test = defineCommand({
    meta: { name: "test", description: "Test-runner commands" },
    subCommands: { changed: testChanged, visual: testVisual },
  })

  return { parity, test }
}

export function legacy(ctx: CliContext) {
  return legacyCommands(ctx)
}
