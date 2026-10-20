#!/usr/bin/env node
// Documentation link check: every repository path the agent-facing documents,
// the figma-to-code config and the scripts point to must exist, and the
// figma-to-code skill stays agnostic (no docs/ paths, no ADR mentions, no
// nodeIds, no component names).
//
// Three roots meet here: the audited package (the guides, its README, the
// figma-to-code config), the workspace (the agent documents, the ADRs and the
// workflows) and the tooling package itself (the scripts and their README).
// The check resolves all three, so a document may cite any of them. A tree
// without a workspace manifest keeps the audited root as the workspace, which
// is what the regression tests build.
//
// Run: node src/cli.ts check docs (from anywhere; PAGOPA_UI_ROOT names the package)
import fs from "node:fs"
import path from "node:path"
import { walkFiles } from "../lib/fs.ts"
import { enterRoot, TOOLING_ROOT } from "../lib/paths.ts"

export function runDocLinks(): number {
  const root = enterRoot()
  const errors: string[] = []
  const SKIPPED_SKILLS = new Set(["shadcn"])
  const LOCAL_PREFIXES = [".figma/", "node_modules/", "dist/", "coverage/"]

  function findWorkspaceRoot(from: string): string {
    for (let current = from; ;) {
      if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) return current
      const parent = path.dirname(current)
      if (parent === current) return from
      current = parent
    }
  }

  const workspace = findWorkspaceRoot(root)
  const SKILL = path.join(workspace, ".agents/skills/figma-to-code")
  // The tooling package is part of the repository this run audits only when it
  // sits inside the workspace: a regression fixture builds its own tree and must
  // not read the real scripts or their README.
  const toolingInWorkspace = TOOLING_ROOT.startsWith(`${workspace}${path.sep}`)

  const existsIn = (base: string, relative: string): boolean =>
    fs.existsSync(path.join(base, relative))
  const exists = (relative: string): boolean =>
    existsIn(root, relative) ||
    existsIn(workspace, relative) ||
    (toolingInWorkspace && existsIn(TOOLING_ROOT, relative))
  const toPosix = (file: string): string => file.split(path.sep).join("/")
  const label = (file: string): string => toPosix(path.relative(workspace, file))
  const lineOf = (text: string, index: number): number => text.slice(0, index).split("\n").length

  function report(file: string, text: string, index: number, message: string): void {
    errors.push(`${label(file)}:${lineOf(text, index)}: ${message}`)
  }

  function isLocal(target: string): boolean {
    const posix = toPosix(target)
    return LOCAL_PREFIXES.some((prefix) => posix.startsWith(prefix) || posix.includes(`/${prefix}`))
  }

  // A code span is a path claim only when it has a slash, no placeholder or
  // command syntax, and its first segment exists next to the document, in the
  // package or at the workspace root (`primitives/x.tsx` inside prose is not a
  // claim).
  function checkCodeSpan(file: string, text: string, index: number, span: string): void {
    if (!span.includes("/") || /[\s${}<>*|()[\]"'`…,]/.test(span)) return
    if (/^[a-z]+:\/\//.test(span) || span.startsWith("@") || span.startsWith("-")) return
    const target = span
      .replace(/:\d+(?:-\d+)?$/, "")
      .replace(/\/$/, "")
      .replace(/#.*$/, "")
    if (target.startsWith("/") || isLocal(target)) return
    const fromDocument = path.resolve(path.dirname(file), target)
    if (fs.existsSync(fromDocument) || exists(target)) return
    const first = target.split("/")[0]
    if (fs.existsSync(path.resolve(path.dirname(file), first)) || exists(first))
      report(file, text, index, `missing path \`${span}\``)
  }

  // Historical and planning documents name retired or future paths in prose on
  // purpose: only their links are claims.
  const LINKS_ONLY = ["docs/", "apps/storybook/src/guides/"]

  // The prefix is written relative to whichever root holds the document.
  function isLinksOnly(file: string): boolean {
    const candidates = [label(file), toPosix(path.relative(root, file))]
    return LINKS_ONLY.some((prefix) =>
      candidates.some((candidate) => !candidate.startsWith("..") && candidate.startsWith(prefix)),
    )
  }

  function checkMarkdown(file: string): string {
    const text = fs.readFileSync(file, "utf8")
    const prose = text.replace(/```[\s\S]*?```/g, (block) => block.replace(/[^\n]/g, " "))
    for (const match of prose.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
      const target = match[1]
      if (/^[a-z]+:/i.test(target) || target.startsWith("#")) continue
      const clean = decodeURI(target.replace(/[#?].*$/, ""))
      const resolved = path.resolve(path.dirname(file), clean)
      if (!isLocal(path.relative(workspace, resolved)) && !fs.existsSync(resolved))
        report(file, text, match.index ?? 0, `missing link ${target}`)
    }
    if (isLinksOnly(file)) return text
    for (const match of prose.matchAll(/`([^`\n]+)`/g))
      checkCodeSpan(file, text, match.index, match[1])
    return text
  }

  function componentNames() {
    const names = new Set<string>()
    for (const file of walkFiles(
      path.join(root, "src/components"),
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

  function checkSkillAgnostic(file: string, text: string, names: Set<string>): void {
    for (const match of text.matchAll(/\bdocs\//g))
      report(file, text, match.index ?? 0, "the skill cites a docs/ path")
    for (const match of text.matchAll(/\bADR\b|\bADR-\d+/g))
      report(file, text, match.index ?? 0, "the skill cites an ADR")
    for (const match of text.matchAll(/\b\d+[:-]\d{3,}\b/g))
      report(file, text, match.index ?? 0, `the skill names a node id ${match[0]}`)
    for (const match of text.matchAll(/\b[A-Z][A-Za-z0-9]+\b/g))
      if (names.has(match[0]))
        report(file, text, match.index ?? 0, `the skill names the component ${match[0]}`)
  }

  function checkConfig(file: string): void {
    if (!fs.existsSync(file)) return
    const text = fs.readFileSync(file, "utf8")
    for (const match of text.matchAll(/^\s+[A-Za-z]+:\s*"?([^"\s#]+)"?\s*$/gm)) {
      const value = match[1]
      if (/^[a-z]+:\/\//.test(value) || isLocal(value)) continue
      if (!exists(value)) report(file, text, match.index ?? 0, `missing path ${value}`)
    }
  }

  function checkScript(file: string): void {
    const text = fs.readFileSync(file, "utf8")
    const pattern =
      /(?:\.agents|docs|src|scripts)\/[\w./-]+\.md\b|(?<![\w/.-])(?:AGENTS|CONTRIBUTING|README|CHANGELOG)\.md\b/g
    for (const match of text.matchAll(pattern))
      if (!exists(match[0])) report(file, text, match.index ?? 0, `missing document ${match[0]}`)
    for (const match of text.matchAll(/\.agents\/skills\/([\w-]+)/g))
      if (!exists(`.agents/skills/${match[1]}`))
        report(file, text, match.index ?? 0, `missing skill ${match[1]}`)
  }

  const markdown = [
    ...[
      path.join(workspace, "AGENTS.md"),
      path.join(workspace, "CONTRIBUTING.md"),
      path.join(workspace, "README.md"),
      path.join(root, "CHANGELOG.md"),
      ...(toolingInWorkspace ? [path.join(TOOLING_ROOT, "README.md")] : []),
    ].filter((file) => fs.existsSync(file)),
    ...walkFiles(
      path.join(workspace, ".agents/skills"),
      (file) =>
        file.endsWith(".md") &&
        !SKIPPED_SKILLS.has(toPosix(path.relative(workspace, file)).split("/")[2]),
    ),
    ...walkFiles(path.join(workspace, "apps/storybook/src/guides"), (file) => file.endsWith(".md")),
    ...walkFiles(path.join(workspace, "docs"), (file) => file.endsWith(".md")),
  ]
  const names = fs.existsSync(SKILL) ? componentNames() : new Set<string>()
  for (const file of markdown) {
    const text = checkMarkdown(file)
    if (file.startsWith(`${SKILL}${path.sep}`)) checkSkillAgnostic(file, text, names)
  }
  checkConfig(path.join(root, "figma-to-code.yaml"))
  const scriptRoots = [
    ...(fs.existsSync(path.join(root, "scripts"))
      ? [
          ...fs
            .readdirSync(path.join(root, "scripts"), { withFileTypes: true })
            .filter((entry) => entry.isFile() && entry.name.endsWith(".mjs"))
            .map((entry) => path.join(root, "scripts", entry.name)),
          ...walkFiles(path.join(root, "scripts/figma-parity"), (name) => name.endsWith(".mjs")),
        ]
      : []),
    ...(toolingInWorkspace
      ? [
          ...walkFiles(path.join(TOOLING_ROOT, "src"), (name) => name.endsWith(".ts")),
          ...walkFiles(path.join(TOOLING_ROOT, "tests"), (name) => name.endsWith(".ts")),
        ]
      : []),
    ...walkFiles(path.join(workspace, ".github/workflows"), (name) => /\.ya?ml$/.test(name)),
  ]
  for (const file of scriptRoots.filter((name) => !/\.test\.(?:mjs|ts)$/.test(name)))
    checkScript(file)

  if (errors.length) {
    console.error(
      `docs:check: ${errors.length} problem(s)\n${errors.map((error) => `  ${error}`).join("\n")}`,
    )
    return 1
  }
  console.log(`docs:check: ${markdown.length} documents, config and scripts resolve`)
  return 0
}
