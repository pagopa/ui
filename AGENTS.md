# AGENTS.md — pagopa-ui

React design system implementing a Figma library. What holds for people and
agents alike — the monorepo layout, the Nx tasks, the green chain, Figma
read-only, branches and commits — is in [CONTRIBUTING.md](./CONTRIBUTING.md).
This file adds what holds only for agents.

## Rules

1. **Never read `.env`.** Never read, source or load it; Vite and Storybook
   disable env-file loading on purpose. Live Figma steps need `FIGMA_TOKEN`
   exported by the person, or they run the read-only exporter and hand over its
   JSON output.
2. **Green before commit**: [the green chain](./CONTRIBUTING.md#the-green-chain),
   run in full, through Nx. Stories run in a browser: when they cannot start,
   say so and never count them as passed.
3. **The package owns the code.** The design system is `packages/pagopa-ui`, its
   generated artwork is `packages/artwork`, its design foundations are
   `packages/tokens` and its checks and Figma tooling are
   `packages/ui-cli`: run their targets with
   `pnpm nx run <project>:<target>`, never with a path that walks out of the
   project.
4. **English whatever the session language.** Documentation, code comments and
   pull request titles and descriptions are written in English even when the
   session runs in Italian. Italian stays only where the product renders it:
   component and story texts, and the UI examples quoted in a guide.

## Skills

Each skill stands alone and never points at another skill or at this file; the
orchestration lives here.

- [`pagopa-ui-standards`](.agents/skills/pagopa-ui-standards/SKILL.md) — how a
  component, its props, texts, story, test and guide are written, and the
  definition of done of a component. Every component, with or without Figma.
- [`figma-to-code`](.agents/skills/figma-to-code/SKILL.md) — the Figma workflow:
  deltas, new nodes, alignment and parity, devices, tokens, icons, pictograms
  and node reviews.

| Work                                                       | Skills                                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| A component, prop, text, story, test or guide with no node | `pagopa-ui-standards`                                                                           |
| A component from a Figma node, its alignment or its review | both: done when the standards' definition of done and the `figma-to-code` source alignment hold |
| A component with no node joining the public API            | both: `figma-to-code` adds the catalogue coverage                                               |
| A Figma delta, tokens, icons, pictograms                   | `figma-to-code`; `pagopa-ui-standards` for each component it touches                            |

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
