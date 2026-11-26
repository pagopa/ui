# ADR-0010 — One compiler: the stable TypeScript 6 line, and the preview alias is gone

- **Status:** Accepted — 2026-11-26.
- **Date:** 2026-11-26
- **Context:** every manifest declared two TypeScript packages side by side. The
  `typescript` name was an alias for `npm:@typescript/typescript6@^6.0.2`, the
  package that publishes the TypeScript 6 API with `tsc6` as its only binary;
  `@typescript/native` was an alias for `npm:typescript@^7.0.2`, the preview
  line, whose `tsc` was the binary the `typecheck` and `build` targets ran. The
  split was deliberate — the compiler ran on the preview line while the tools
  that read the compiler programmatically kept reading 6
  ([ADR-0005](./0005-nx-monorepo.md) §3.4) — and it cost two versions to
  upgrade wherever a manifest declared one, an answer to "which compiler
  typechecked this" that depended on whether you asked `tsc --version` or
  `require("typescript").version`, and an alias whose name read as the preview
  package in the five manifests and the lockfile.
- **Related:** [ADR-0005](./0005-nx-monorepo.md) (the toolchain decision this one
  amends), [ADR-0001](./0001-rework.md) (the simplification this serves).

## 1. Problem

The workspace compiled on TypeScript 7 and exposed the TypeScript 6 API under
the same name the tools resolve. On the tree before this decision `tsc
--version` answered `7.0.2` while `require("typescript").version` answered
`6.0.3`: two packages, two upgrade tracks, and a lockfile holding both the
native 7 distribution and all of its platform binaries beside the 6 API package.

The bridge was never a design goal of its own. It existed because the preview
line ships the compiler as a Go binary with a `lib/tsc.js` launcher and no
`lib/typescript.js`, so any tool that imports the compiler API —
`react-docgen-typescript` behind the Storybook docgen, `@nx/js/typescript` —
could not run on it. The package name was the lever that let both coexist:
`tsc` came from the preview alias, the API from the 6 alias.

## 2. Decision space

**A — keep the bridge.** Declare both packages, and pin the two versions
together on every upgrade.

- Pros: nothing changes; the compiler keeps the preview line's speed.
- Cons: the two versions stay coupled by hand, and every reader of a manifest
  has to learn which alias is the compiler and which is the API.

**B — the preview line as the single compiler.** Declare `typescript@^7.0.2`
under its real name and drop both aliases.

- Pros: one package, the fastest compiler.
- Cons: it publishes no `lib/typescript.js`, and `react-docgen-typescript`
  declares `typescript >= 4.3.x` as a peer and imports the compiler API; the
  Storybook docgen would stop generating props. Every API consumer would need an
  alias of its own — the bridge again, one consumer at a time.

**C — the stable TypeScript 6 line as the single compiler.** Declare
`typescript@^6.0.2` under its real name and drop both aliases.

- Pros: the package publishes both the compiler (`bin/tsc`) and the API
  (`lib/typescript.js`), so one declaration serves the tasks and the tools; the
  line is the current stable one, and its API is the one the tools already read.
- Cons: the compiler is the JavaScript one, not the preview line's binary.

## 3. Decision

**C.** Every manifest — the root and the five workspace projects — declares one
devDependency, `"typescript": "^6.0.2"`, resolving to 6.0.3. The
`@typescript/native` and `@typescript/typescript6` aliases are removed from the
manifests and from `pnpm-lock.yaml`.

### RD1 — the stable line is the one with an API

The tiebreaker is not speed but the published surface. A single compiler must
serve `tsc -b`, `tsc -p tsconfig.lib.json`, api-extractor and the docgen that
imports the compiler, so it must publish `lib/typescript.js`. Only the stable
line does; the preview line is a compiler binary and a launcher.

### RD2 — the tools that bring their own compiler keep it

`@microsoft/api-extractor` declares `typescript` 5.9.3 as its own dependency and
resolves it from its own tree, so the API report is produced by that compiler
whether the workspace agrees or not; `@nx/js` likewise carries 6.0.3. This
decision governs the compiler the workspace declares, not the private copies a
tool installs for itself.

### RD3 — the consumer fixtures install the workspace version

`check library` builds two consumers from the installed package. Both now take
`typescript` at the workspace version instead of translating one alias into the
other: the client fixture compiles with it, and the RSC fixture relies on it
because Next loads the TypeScript API from `lib/typescript.js`.

## 4. Consequences

- One version answers every question: `tsc --version` and
  `require("typescript").version` both report 6.0.3, and an upgrade is one range
  in six manifests.
- The lockfile loses the preview distribution and its platform binaries; the
  aliases no longer appear anywhere in it.
- `typecheck` on the five projects, the `pagopa-ui` build and `api:check` pass
  on the single compiler, and the API report is byte-identical: the compiler
  changed, the public surface did not.
- The workspace gives up the preview line's compile speed until it qualifies
  under RD1. Re-adopting it is a new decision, not an edit.

## 5. Deferred decisions with triggers

| Deferred                                                         | Trigger                                                                                                  |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| The preview line becomes the single compiler                     | It publishes `lib/typescript.js`, or every API consumer in the workspace stops importing the compiler    |
| `api-extractor`'s private TypeScript joins the workspace version | It accepts the workspace compiler through a peer or resolves it from the workspace root without an alias |
