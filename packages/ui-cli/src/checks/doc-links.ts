// Documentation link check: every repository path the agent-facing documents,
// the figma-to-code config and the scripts point to must exist, every command
// they name must resolve against the Nx project graph and the root scripts, and
// the figma-to-code skill stays agnostic (no docs/ paths, no ADR mentions, no
// nodeIds, no component names).
//
// Three roots meet here: the audited package (the guides, its README, the
// figma-to-code config), the workspace (the agent documents, the ADRs and the
// workflows) and the tooling package itself (the scripts and their README).
// The check resolves all three, so a document may cite any of them. A tree
// without a workspace manifest keeps the audited root as the workspace, which
// is what the regression tests build.
//
// A `pnpm ui-cli …` command is resolved against the CLI's own tree: the
// subcommands and every `--flag` it names must exist.
import fs from "node:fs"
import path from "node:path"

import type { Workspace } from "../adapters/workspace.ts"
import { walkFiles } from "../lib/fs.ts"
import { readNx } from "./docs/nx.ts"
import { report as checkReport, type CheckReport } from "./report.ts"

export interface DocLinksOptions {
  /** The environment the Nx graph is read with. */
  env: NodeJS.ProcessEnv
  /** Resolves `ui-cli` argument tokens; returns the problem, or null. */
  cliCommand?: (tokens: string[]) => string | null
}

type CommandGraph = {
  projects: Set<string>
  targets: Map<string, Set<string>>
  rootScripts: Set<string> | null
}

type DocsContext = {
  root: string
  TOOLING_ROOT: string
  workspace: string
  // Every skill directory that must stay agnostic: the maintainer skill in the
  // workspace and the consumer skill the package ships.
  SKILLS: string[]
  toolingInWorkspace: boolean
  options: DocLinksOptions
  errors: string[]
  graphRead: boolean
  graph: CommandGraph | null
}

const SKIPPED_SKILLS = new Set(["shadcn"])

const LOCAL_PREFIXES = [".figma/", "node_modules/", "dist/", "coverage/"]

const LINKS_ONLY = ["docs/", "apps/storybook/src/guides/"]

const BUILT_IN = new Set([
  "add",
  "dlx",
  "exec",
  "install",
  "list",
  "outdated",
  "remove",
  "run",
  "update",
  "why",
])

function report(
  ctx: DocsContext,
  file: string,
  text: string,
  index: number,
  message: string,
): void {
  ctx.errors.push(
    `${label(ctx, file)}:${lineOf(text, index)}: ${message} — fix the reference or the command, then run \`pnpm nx run pagopa-ui:docs\``,
  )
}

function isLocal(target: string): boolean {
  const posix = `${toPosix(target).replace(/\/$/, "")}/`
  return LOCAL_PREFIXES.some((prefix) => posix.startsWith(prefix) || posix.includes(`/${prefix}`))
}

function checkCodeSpan(
  ctx: DocsContext,
  file: string,
  text: string,
  index: number,
  span: string,
): void {
  if (!span.includes("/") || /[\s${}<>*|()[\]"'`…,]/.test(span)) return
  if (/^[a-z]+:\/\//.test(span) || span.startsWith("@") || span.startsWith("-")) return
  const target = span
    .replace(/:\d+(?:-\d+)?$/, "")
    .replace(/\/$/, "")
    .replace(/#.*$/, "")
  if (target.startsWith("/") || isLocal(target)) return
  const fromDocument = path.resolve(path.dirname(file), target)
  if (fs.existsSync(fromDocument) || exists(ctx, target)) return
  const first = target.split("/")[0]
  if (fs.existsSync(path.resolve(path.dirname(file), first)) || exists(ctx, first))
    report(ctx, file, text, index, `missing path \`${span}\``)
}

function isLinksOnly(ctx: DocsContext, file: string): boolean {
  const candidates = [label(ctx, file), toPosix(path.relative(ctx.root, file))]
  return LINKS_ONLY.some((prefix) =>
    candidates.some((candidate) => !candidate.startsWith("..") && candidate.startsWith(prefix)),
  )
}

function checkMarkdown(ctx: DocsContext, file: string): string {
  const text = fs.readFileSync(file, "utf8")
  const prose = text.replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, " "))
  for (const match of prose.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1]
    if (/^[a-z]+:/i.test(target) || target.startsWith("#")) continue
    const clean = decodeURI(target.replace(/[#?].*$/, ""))
    const resolved = path.resolve(path.dirname(file), clean)
    if (!isLocal(path.relative(ctx.workspace, resolved)) && !fs.existsSync(resolved))
      report(ctx, file, text, match.index ?? 0, `missing link ${target}`)
  }
  if (isLinksOnly(ctx, file)) return text
  for (const match of prose.matchAll(/`([^`\n]+)`/g))
    checkCodeSpan(ctx, file, text, match.index, match[1])
  checkCommands(ctx, file, text)
  return text
}

function componentNames(ctx: DocsContext) {
  const names = new Set<string>()
  for (const file of walkFiles(
    path.join(ctx.root, "src/components"),
    (name) => /\.tsx?$/.test(name) && !/\.test\./.test(name),
  )) {
    const source = fs.readFileSync(file, "utf8")
    for (const match of source.matchAll(
      /export\s+(?:declare\s+)?(?:function|const|class|type|interface|enum)\s+([A-Z][A-Za-z0-9]+)/g,
    ))
      names.add(match[1])
    for (const match of source.matchAll(/export\s*(?:type\s*)?\{([^}]*)\}/g))
      for (const part of match[1].split(",")) {
        const name = part
          .trim()
          .split(/\s+as\s+/)
          .pop()
          ?.replace(/^type\s+/, "")
        if (name && /^[A-Z][A-Za-z0-9]+$/.test(name)) names.add(name)
      }
  }
  return names
}

function checkSkillAgnostic(
  ctx: DocsContext,
  file: string,
  text: string,
  names: Set<string>,
): void {
  for (const match of text.matchAll(/\bdocs\//g))
    report(ctx, file, text, match.index ?? 0, "the skill cites a docs/ path")
  for (const match of text.matchAll(/\bADR\b|\bADR-\d+/g))
    report(ctx, file, text, match.index ?? 0, "the skill cites an ADR")
  for (const match of text.matchAll(/\b\d+[:-]\d{3,}\b/g))
    report(ctx, file, text, match.index ?? 0, `the skill names a node id ${match[0]}`)
  for (const match of text.matchAll(/\b[A-Z][A-Za-z0-9]+\b/g))
    if (names.has(match[0]))
      report(ctx, file, text, match.index ?? 0, `the skill names the component ${match[0]}`)
}

function checkConfig(ctx: DocsContext, file: string): void {
  if (!fs.existsSync(file)) return
  const text = fs.readFileSync(file, "utf8")
  // A config value is a path claim unless the key names something else: the
  // review pull request number and the branch the review stories live on.
  const NOT_A_PATH = new Set(["pr", "branch"])
  for (const match of text.matchAll(/^\s+([A-Za-z]+):\s*"?([^"\s#]+)"?\s*$/gm)) {
    if (NOT_A_PATH.has(match[1])) continue
    const value = match[2]
    if (/^[a-z]+:\/\//.test(value) || isLocal(value)) continue
    if (!exists(ctx, value)) report(ctx, file, text, match.index ?? 0, `missing path ${value}`)
  }
}

function commandGraph(ctx: DocsContext): CommandGraph | null {
  if (ctx.graphRead) return ctx.graph
  ctx.graphRead = true
  if (!fs.existsSync(path.join(ctx.workspace, "nx.json"))) return null
  let rootScripts: Set<string> | null = null
  const manifest = path.join(ctx.workspace, "package.json")
  if (fs.existsSync(manifest)) {
    try {
      const parsed: { scripts?: Record<string, string> } = JSON.parse(
        fs.readFileSync(manifest, "utf8"),
      )
      rootScripts = new Set(Object.keys(parsed.scripts ?? {}))
    } catch {
      rootScripts = null
    }
  }
  try {
    const projects = new Set<string>(
      JSON.parse(readNx(ctx.workspace, ctx.options.env, ["show", "projects", "--json"])),
    )
    ctx.graph = { projects, targets: new Map(), rootScripts }
  } catch {
    // Nx is not runnable here: the command part stays silent rather than
    // reporting every command as unknown.
    ctx.graph = null
  }
  return ctx.graph
}

function projectTargets(
  ctx: DocsContext,
  projects: CommandGraph,
  name: string,
): Set<string> | null {
  if (!projects.projects.has(name)) return null
  const cached = projects.targets.get(name)
  if (cached) return cached
  try {
    const shown: { targets?: Record<string, unknown> } = JSON.parse(
      readNx(ctx.workspace, ctx.options.env, ["show", "project", name, "--json"]),
    )
    const targets = new Set(Object.keys(shown.targets ?? {}))
    projects.targets.set(name, targets)
    return targets
  } catch {
    return null
  }
}

function commandList(value: string | undefined): string[] {
  return value ? value.split(",").filter(Boolean) : []
}

function optionValue(tokens: string[], names: string[]): string | undefined {
  for (let position = 0; position < tokens.length; position += 1) {
    const token = tokens[position]
    for (const name of names) {
      if (token === name) return tokens[position + 1]
      if (token.startsWith(`${name}=`)) return token.slice(name.length + 1)
    }
  }
  return undefined
}

function checkTarget(
  ctx: DocsContext,
  file: string,
  text: string,
  index: number,
  graphValue: CommandGraph,
  project: string,
  target: string,
): void {
  const targets = projectTargets(ctx, graphValue, project)
  if (targets === null) {
    if (!graphValue.projects.has(project))
      report(ctx, file, text, index, `unknown Nx project ${project}`)
    return
  }
  // A target may carry a configuration (`build:ci`); the base is the target.
  if (!targets.has(target) && !targets.has(target.split(":")[0]))
    report(ctx, file, text, index, `unknown Nx target ${project}:${target}`)
}

function checkCliCommand(
  ctx: DocsContext,
  file: string,
  text: string,
  index: number,
  raw: string,
): void {
  if (!ctx.options.cliCommand) return
  for (const part of raw.split(/&&|\|\||;|\|/)) {
    const tokens = part.trim().split(/\s+/)
    const at = tokens.findIndex(
      (token, position) => token === "ui-cli" && tokens[position - 1] === "pnpm",
    )
    if (at < 0) continue
    const concrete = tokens.slice(at + 1).filter((token) => !/[<>{}$…[\]]/.test(token))
    const problem = ctx.options.cliCommand(concrete)
    if (problem) report(ctx, file, text, index, problem)
  }
}

function checkNxCommand(
  ctx: DocsContext,
  file: string,
  text: string,
  index: number,
  commands: CommandGraph,
  tokens: string[],
): void {
  const subcommand = tokens[2]
  if (subcommand === "run") {
    const spec = tokens[3]
    if (!spec || spec.startsWith("-")) return
    const separator = spec.indexOf(":")
    if (separator < 0) return
    checkTarget(
      ctx,
      file,
      text,
      index,
      commands,
      spec.slice(0, separator),
      spec.slice(separator + 1),
    )
  } else if (subcommand === "run-many") {
    const projects = commandList(optionValue(tokens.slice(3), ["-p", "--projects"]))
    const targets = commandList(optionValue(tokens.slice(3), ["-t", "--targets"]))
    for (const project of projects)
      for (const target of targets) checkTarget(ctx, file, text, index, commands, project, target)
    if (!targets.length) {
      for (const project of projects)
        if (!commands.projects.has(project))
          report(ctx, file, text, index, `unknown Nx project ${project}`)
    }
  }
}

function checkFilteredCommand(
  ctx: DocsContext,
  file: string,
  text: string,
  index: number,
  commands: CommandGraph,
  tokens: string[],
): void {
  const filter = tokens[2]
  let position = 3
  if (tokens[position] === "exec" || tokens[position] === "dlx") return
  if (tokens[position] === "run") position += 1
  const script = tokens[position]
  if (!filter) return
  const targets = projectTargets(ctx, commands, filter)
  if (targets === null) {
    report(ctx, file, text, index, `unknown workspace package ${filter}`)
    return
  }
  if (script && !targets.has(script))
    report(ctx, file, text, index, `unknown script ${script} in ${filter}`)
}

function checkCommand(
  ctx: DocsContext,
  file: string,
  text: string,
  index: number,
  raw: string,
): void {
  checkCliCommand(ctx, file, text, index, raw)
  const commands = commandGraph(ctx)
  if (!commands) return
  // A placeholder is an instruction to fill in, not a command to run.
  if (/[<>{}$…]/.test(raw)) return
  for (const part of raw.split(/&&|\|\||;/)) {
    const command = part.trim().replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S+\s+)+/, "")
    if (!command.startsWith("pnpm ")) continue
    const tokens = command.split(/\s+/)
    if (tokens[1] === "--filter" || tokens[1] === "-F") {
      checkFilteredCommand(ctx, file, text, index, commands, tokens)
      continue
    }
    const first = tokens[1]
    if (!first || first.startsWith("-")) continue
    if (first === "nx") {
      // `nx affected`, `nx release`, `nx show` and the rest need a live graph
      // or their own arguments: nothing static to validate.
      checkNxCommand(ctx, file, text, index, commands, tokens)
      continue
    }
    if (BUILT_IN.has(first) || first === "ui-cli") continue
    if (first === "run") {
      const script = tokens[2]
      if (!script) continue
      if (commands.rootScripts && !commands.rootScripts.has(script))
        report(ctx, file, text, index, `unknown pnpm script ${script}`)
      continue
    }
    if (!commands.rootScripts) continue
    if (!commands.rootScripts.has(first))
      report(ctx, file, text, index, `unknown pnpm script ${first}`)
  }
}

function checkCommands(ctx: DocsContext, file: string, text: string): void {
  for (const match of text.matchAll(/(`+)([^`\n]+)\1/g)) {
    const span = match[2]
    if (span.trim().startsWith("pnpm ")) checkCommand(ctx, file, text, match.index ?? 0, span)
  }
  for (const fence of text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)) {
    const body = fence[1].replace(/\\\n/g, " ")
    const offset = fence.index ?? 0
    for (const line of body.split("\n"))
      if (line.trim().startsWith("pnpm ")) checkCommand(ctx, file, text, offset, line.trim())
  }
}

function checkScript(ctx: DocsContext, file: string): void {
  const text = fs.readFileSync(file, "utf8")
  const pattern =
    /(?:\.agents|docs|src|scripts)\/[\w./-]+\.md\b|(?<![\w/.-])(?:AGENTS|CONTRIBUTING|README|CHANGELOG)\.md\b/g
  for (const match of text.matchAll(pattern))
    if (!exists(ctx, match[0]))
      report(ctx, file, text, match.index ?? 0, `missing document ${match[0]}`)
  for (const match of text.matchAll(/\.agents\/skills\/([\w-]+)/g))
    if (!exists(ctx, `.agents/skills/${match[1]}`))
      report(ctx, file, text, match.index ?? 0, `missing skill ${match[1]}`)
}

const existsIn = (base: string, relative: string): boolean =>
  fs.existsSync(path.join(base, relative))

const exists = (ctx: DocsContext, relative: string): boolean =>
  existsIn(ctx.root, relative) ||
  existsIn(ctx.workspace, relative) ||
  (ctx.toolingInWorkspace && existsIn(ctx.TOOLING_ROOT, relative))

const toPosix = (file: string): string => file.split(path.sep).join("/")

const label = (ctx: DocsContext, file: string): string =>
  toPosix(path.relative(ctx.workspace, file))

const lineOf = (text: string, index: number): number => text.slice(0, index).split("\n").length

function markdownFiles(ctx: DocsContext): string[] {
  return [
    ...[
      path.join(ctx.workspace, "AGENTS.md"),
      path.join(ctx.workspace, "CONTRIBUTING.md"),
      path.join(ctx.workspace, "README.md"),
      path.join(ctx.root, "CHANGELOG.md"),
      ...(ctx.toolingInWorkspace ? [path.join(ctx.TOOLING_ROOT, "README.md")] : []),
    ].filter((file) => fs.existsSync(file)),
    ...walkFiles(
      path.join(ctx.workspace, ".agents/skills"),
      (file) =>
        file.endsWith(".md") &&
        !SKIPPED_SKILLS.has(toPosix(path.relative(ctx.workspace, file)).split("/")[2]),
    ),
    ...walkFiles(path.join(ctx.workspace, "apps/storybook/src/guides"), (file) =>
      file.endsWith(".md"),
    ),
    ...walkFiles(path.join(ctx.root, "skills"), (file) => file.endsWith(".md")),
    ...walkFiles(path.join(ctx.workspace, "docs"), (file) => file.endsWith(".md")),
  ]
}

function scriptFiles(ctx: DocsContext): string[] {
  return [
    ...(fs.existsSync(path.join(ctx.root, "scripts"))
      ? [
          ...fs
            .readdirSync(path.join(ctx.root, "scripts"), { withFileTypes: true })
            .filter((entry) => entry.isFile() && entry.name.endsWith(".mjs"))
            .map((entry) => path.join(ctx.root, "scripts", entry.name)),
          ...walkFiles(path.join(ctx.root, "scripts/figma-parity"), (name) =>
            name.endsWith(".mjs"),
          ),
        ]
      : []),
    ...(ctx.toolingInWorkspace
      ? [
          ...walkFiles(path.join(ctx.TOOLING_ROOT, "src"), (name) => name.endsWith(".ts")),
          ...walkFiles(path.join(ctx.TOOLING_ROOT, "tests"), (name) => name.endsWith(".ts")),
        ]
      : []),
    ...walkFiles(path.join(ctx.workspace, ".github/workflows"), (name) => /\.ya?ml$/.test(name)),
  ]
}

function validateMarkdownFiles(context: DocsContext, files: string[]): string[] {
  const ctx = { ...context, errors: [] }
  const skills = ctx.SKILLS.filter((dir) => fs.existsSync(dir))
  const names = skills.length ? componentNames(ctx) : new Set<string>()
  for (const file of files) {
    const text = checkMarkdown(ctx, file)
    if (skills.some((dir) => file.startsWith(`${dir}${path.sep}`)))
      checkSkillAgnostic(ctx, file, text, names)
  }
  return ctx.errors
}

function validateConfig(context: DocsContext): string[] {
  const ctx = { ...context, errors: [] }
  checkConfig(ctx, path.join(ctx.root, "figma-to-code.yaml"))
  return ctx.errors
}

function validateScripts(context: DocsContext): string[] {
  const ctx = { ...context, errors: [] }
  for (const file of scriptFiles(ctx).filter((name) => !/\.test\.(?:mjs|ts)$/.test(name)))
    checkScript(ctx, file)
  return ctx.errors
}

export function checkDocLinks(workspaceTree: Workspace, options: DocLinksOptions): CheckReport {
  const { root, toolingRoot: TOOLING_ROOT, workspaceRoot: workspace } = workspaceTree
  const SKILLS = [path.join(workspace, ".agents/skills/figma-to-code"), path.join(root, "skills")]
  const ctx: DocsContext = {
    root,
    TOOLING_ROOT,
    workspace,
    SKILLS,
    options,
    toolingInWorkspace: TOOLING_ROOT.startsWith(`${workspace}${path.sep}`),
    errors: [],
    graphRead: false,
    graph: null,
  }
  const markdown = markdownFiles(ctx)
  const errors = [
    ...validateMarkdownFiles(ctx, markdown),
    ...validateConfig(ctx),
    ...validateScripts(ctx),
  ]
  return checkReport("docs", `${markdown.length} documents, config and scripts resolve`, errors)
}
