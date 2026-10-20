# ADR-0001 — Rework: alignment review model and the visual-diff evolution

- **Status:** Accepted — Option B (PR review), confirmed on 2026-10-12.
- **Date:** 2026-10-12
- **Context:** pagopa-ui rework (F0–F6). F0–F3 committed (`389dac3`…`d7de830`), F5 largely committed
  (`d15606e`, `2d4b544`), F4 (Figma governance) implemented as Option B.

## 1. Problem

The Figma catalogue records, per published node, a target (module/export/story) and an approval.
Today the approval is a machine-enforced attestation: `reviewRequired: true` demands a
`reviewedFingerprint` (a hash over the node's design evidence and transitive dependencies) plus
explicit `storyExports`, and `pnpm figma:check` fails when the hash is stale. The weekly drift job
(`.github/workflows/figma-drift.yml`, Monday 04:00 UTC and `workflow_dispatch`) detects
live-versus-committed drift and fails; reconciliation is manual.

Observed costs of the attestation model:

- the approval is a hash copied into JSON: the human act of review is invisible in the pull
  request, and nobody reviews fingerprints;
- the ceremony does not prove visual fidelity — AGENTS.md states explicitly that `implemented`
  is not a visual review;
- the drift job reports but cannot carry the fix: the delta has no artifact.

## 2. Decision space (F4)

**Option A — hard gate.** Keep `reviewedFingerprint` + `reviewRequired`; CI forbids a stale
approval after any design change.

- Pros: mechanically enforced, hermetic, no process dependence.
- Cons: opaque approval, review invisible in the diff, ceremony without visual evidence, the
  drift loop stays manual.

**Option B — PR review (the compromise).** Remove the attestation (`reviewedFingerprint` and
`reviewRequired` for production nodes). **Keep `contractFingerprint` + `designFingerprint`**: they
are the detection layer — without them the drift job cannot see design-evidence changes. The drift
job opens one PR with the refreshed inventory and the queued `pending` nodes; the merge is the
approval record; the `pending` queue is the visible signal; the audit trail is
`git log -p src/catalog/figma/registry.json`.

- Pros: the review artifact is the diff itself; approval is visible and auditable; no hash
  ceremony.
- Cons: approval depends on process discipline (a merge), not on a machine check; the drift PR
  needs a bot identity able to trigger CI on its own PR (the default `GITHUB_TOKEN` cannot); the
  CI gate becomes "no drift against the committed inventory" instead of "no stale approval".

**Automated either way:** design-source drift detection (fingerprints), the hermetic `figma:check`,
the `pending` queue, icon/pictogram checksums and the token manifest check.

## 3. Decision

**Option B.** The machine-checkable part (detection) is preserved; the machine-enforced part that
nobody could review (the attestation) moves to a visible artifact (the drift PR). The current debt
— 77 `pending` nodes (59 from the dependency-graph repair), verified with
`node scripts/figma-sync.mjs --plan` — stays visible in the queue instead of being bulk-approved;
historical mappings are reviewed per node on demand.

## 4. F4 specification (accepted UX)

1. Scheduled job (Monday 04:00 UTC + `workflow_dispatch`) fetches the live snapshot and compares it
   with the committed inventory. No drift → green. Drift → one branch + one PR: refreshed
   `inventory.json`, `registry.json` queued (`pending`) for added/changed/affected nodes.
2. PR body: summary counts by change class and page; per node → name, nodeId, Figma link, change
   class, the change in human terms, current status/target, and the review instructions (§7).
3. Review decisions per node: still matches → `implemented`; must change → update code and story
   inside the PR, then `implemented`; out of scope → `excluded` with a reason.
4. Merge = approval record. Audit: `git log -p src/catalog/figma/registry.json`.
5. No bulk approval of the 77 `pending` nodes (59 came from the dependency-graph repair); they stay
   pending unless the user asks.
6. Build items: PR mode in the drift job; readable delta renderer; a bot identity that can open
   PRs and trigger CI; update `AGENTS.md`, `CONTRIBUTING.md`, the Figma workflow skill,
   `scripts/README.md` and the `figma-sync` tests.
7. Visual regression is **not** part of F4: it is a separate decision, off by default (§5).

## 5. Future development — visual diff by default instead of fingerprints

### 5.1 Two different signals

- **Design-source drift (Figma side).** Today `designFingerprint` detects it hermetically. A visual
  diff does not detect it by itself: comparing renders needs a reference.
- **Rendered drift (code side).** Today stories, axe and the behavior suites catch functional
  regressions; there is no pixel baseline, and AGENTS.md records that visual review is
  outstanding.

### 5.2 End state

The drift PR shows, per implemented node, a visual diff between a **pinned Figma render** (at the
snapshot version) and the **story render**; reviewing that diff is the approval. `designFingerprint`
retires from component nodes; fingerprints remain only where visual comparison is meaningless
(icon/pictogram checksums, token manifest).

### 5.3 Staged path

- **V1 — visual regression off by default.** A curated story set, local Playwright screenshots,
  baselines committed; catches code-side regressions only.
- **V2 — pin Figma renders.** Export each implemented node's render at the snapshot version, store
  the approved reference, show the side-by-side in the drift PR.
- **V3 — visual evidence replaces the design fingerprint** for nodes that have a story and a
  reference; approving the reviewed diff is what clears `pending`.
- **V4 — fingerprints retired for component nodes**; kept for generated artwork (checksums) and the
  token manifest.

### 5.4 Conditions and open questions

- Stable rendering: bundled fonts and fixed browser/viewport are already true; the three-engine
  runner provides the harness (forced colors and reduced motion variants included).
- Baselines: committed images versus an external service (Chromatic is already a devDependency but
  unused; private-repo and cost implications) — decide in V1.
- Pixel flake policy: thresholds and retries (the consumer runner already retries once), plus
  anti-aliasing variance across engines.
- Where the review happens: the drift PR body versus a report artifact.
- Trigger to start V1: after the F4 PR flow has completed at least one full cycle.

## 6. Deferred decisions (with triggers)

Recorded in [ADR-0002](./0002-deferred-decisions.md): the workspace split,
lucide → `PagoPAIcon`, public API evolution and dark mode, each with its
context, options and trigger; the Titillio font adoption is recorded there as
resolved on 2026-10-14.

## 7. PR templates (explicit instruction)

**Phase PRs (F4/F6).**

- Objective + phase; review order (files); what stays unchanged (public API frozen: the export
  names in `src/pagopa-ui.ts`).
- **Instructions — verify:** run and report the pre-commit chain documented in `AGENTS.md`.
- **Instructions — review:** the acceptance criteria of the phase and what to check in the diff.

**Drift PRs (F4).** Per node, the three decisions as explicit instructions:

1. still matches → set `status: implemented`;
2. must change → update code and story in the PR, then `implemented`;
3. out of scope → `excluded` with a reason.

Plus the Figma link and the human-readable change for each node.

## 8. Consequences

- F4 touches `scripts/figma-sync.mjs` (attestation checks removed, PR mode added),
  `.github/workflows/figma-drift.yml`, `AGENTS.md`, `CONTRIBUTING.md`, the Figma workflow
  skill, `scripts/README.md` and the `figma-sync` tests; the registry schema drops the attestation
  fields for component nodes while keeping the mapping (nodeId identity, targets, statuses).
- The `pending` queue remains the visible signal; no bulk approval.
- The visual-diff evolution changes _what the review guarantees_: from a design-source hash to a
  reviewed render; it should not start before the F4 PR flow has proven itself.

## 9. Design debt resolution (F6)

Resolved read-only against the Figma library through the authenticated MCP (no token, no writes).
Each item is a decision, not an open question:

| Debt                                                   | Resolution                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rounded-xl` rendered 11.2px against a 16px Figma step | The Tailwind radius slots now alias the Figma foundations only: `sm`–`lg` → 8px, `xl`/`2xl` → 16px, `3xl`/`4xl` → 24px. No interpolated values remain.                                                                                                                                                                                       |
| `--success`/`--warning`/`--info` local solids          | Bound to `Color/Icon/Success icon`, `Color/Icon/Warning icon`, `Color/Icon/Info icon` (#427940/#a5822a/#418daf). Text usages already route through the `*-foreground` (850) tokens, so contrast stays AA.                                                                                                                                    |
| `--primary-hover`, `--accent`, `--accent-active`       | Bound to `Color/Blue/Blue 600` and `Color/Opacity/Blue 500 8/40` (the Figma blue tint steps).                                                                                                                                                                                                                                                |
| `--primary-active`, `--destructive-hover`              | Documented local extensions: the Figma pressed variables (`Color/Button/Button primary pressed`, `error pressed`) are not bound to any node reachable from this file, so no value could be verified. Re-link when they become reachable.                                                                                                     |
| `--avatar-frame`, `--avatar-icon-surface`              | Documented local extensions (contrast ring and inverse-artwork surface); no Figma source exists.                                                                                                                                                                                                                                             |
| `--navy`, `--navy-deep`, `--brand-cyan`                | Brand colors outside both published collections; unchanged and already reasoned.                                                                                                                                                                                                                                                             |
| 13 unresolved variables                                | 4 resolved with verified values (Blue 150/200/850, `Color/Surface/Surface overlay`), 9 disposed by reasoned exclusion patterns (App IO opacities, `Black 35` superseded by `Surface overlay`, Blu Italia brand surface, timeline spacing floats). The refresh now **fails** on any unresolved variable without a policy, so none can linger. |
| `Headings/H2` not captured                             | Finding: `Headings/H1–H6 + Hero` are App IO text styles; the file binds only Hero/H3/H4 (captured). H1/H2/H5/H6 are not used by any published node, so they are out of scope until a component consumes them.                                                                                                                                |
| Typography scale partial (MD/SM/XS only)               | Completed with the verified XXL/XL/LG titles and their Mobile variants (`text-title-xxl`…`text-title-lg-mobile`), completing the MUI Italia Next title scale.                                                                                                                                                                                |

The manifest grew from 106 to 116 variables with 31 recorded exclusions; `tokens:check` is green and
the generated CSS, inventory and class list are re-emitted from the manifest.
