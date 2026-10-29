# Design Review PagoPA UI: a React design system aligned with the Figma library

## <!-- id: metadata -->Header and references

| ID | Value |
| --- | --- |
| `metadata.status` | draft |
| `metadata.title` | PagoPA UI — a React design system aligned with the Figma library |
| `metadata.canonical-outcome-id` | PAGOPA-UI-DS |
| `metadata.source-id` | repository path: `pagopa/ui` (direct repository intake) |
| `metadata.owner` | `@pagopa/engineering-team-devex` (from `.github/CODEOWNERS`, to be confirmed — `open.item-001`) |
| `metadata.authors` | TBD — `open.item-002` |
| `metadata.last-updated` | 2026-10-29 |
| `metadata.version` | 0.1 |

## Related artifacts

| ID | Artifact | Link or reference | Relationship / status |
| --- | --- | --- | --- |
| `references.prd` | PRD | N/A — direct DR/SRS intake | No PRD in the repository: outcome and scope live in `Expected outcome` (`open.item-011`) |
| `references.rfc` | RFCs | N/A — no RFC | The design decisions are in ADRs `docs/decisions/0001`–`0005`, all `accepted` and already reflected in this document |
| `references.service-blueprint` | Service Blueprint | N/A — reason | The library has no product journey of its own; the journey is the one of adoption by the consuming applications (`open.item-019`) |
| `references.figma` | Figma / design discovery | fileKey `pvhsJpPGQbEwNLiyP7BOIw` — "MUI Italia Next" library; inventory snapshot `fileVersion 2415097349015371204`, read on 2026-10-28 | Source of truth for design, read-only |
| `references.contracts` | OpenAPI / AsyncAPI / Data Contract | `packages/pagopa-ui/etc/pagopa-ui.api.md`, `packages/pagopa-ui/package.json` (`exports`), `packages/tokens/src/manifest.json`, `packages/pagopa-ui/src/catalog/figma/*.json` | No HTTP API and no event: the contracts are of artifact, of theme and of catalogue |
| `references.repository` | Repository | https://github.com/pagopa/ui | Target codebase, Nx monorepo |
| `references.reviews` | Security / Privacy / Legal reviews | N/A — reason | No security, privacy or legal review is recorded in the repository: gaps tracked in `NFR-04`, `NFR-05`, `open.item-005`, `open.item-006` |
| `references.dpia` | DPIA / privacy review | N/A — confirmed: the library is client-side code with no collection, transmission or persistence of personal data | Formal confirmation from the controller is not recorded (`open.item-006`) |
| `references.launch-review` | Launch Readiness Review (separate Go/No-Go) | N/A — reason | No LRR: the repository is declared experimental and not production-ready (`README.md`), so there is not yet a launch to authorise |
| `references.glossary` | Business glossary (PRD/Confluence) | `GLOSSARY.md` | Vocabulary of the Figma-alignment domain; the solution glossary lives in this DR/SRS |
| `references.operations` | Jira board / runbook / readiness artifacts | `docs/figma-drift-handoff.md`, `docs/figma-drift-secrets.md`, `.github/workflows/*` | Drift and secrets runbooks exist; no linked Jira board |

<!-- id: expected-outcome -->

## Expected outcome of the initiative — `Always`

| ID | Item | Description | Source / status |
| --- | --- | --- | --- |
| `outcome.context` | Context and problem | PagoPA applications build their interfaces on MUI Italia, a Material UI v5 theme: an outdated base, customised per application, with no systematic way of knowing whether the implemented code matches the design. A rich Figma library exists (355 published components) and no React implementation translates it in a verifiable way. | Confirmed: `README.md`, `docs/reports/2026-10-25-mui-italia-comparison.md`, `packages/pagopa-ui/src/catalog/figma/inventory.json` |
| `outcome.objective` | Expected outcome | A publishable React design system that (a) implements the Figma library with a demonstrable and repeatable alignment, (b) exposes a stable and verified public surface, (c) distributes the Storybook catalogue as navigable documentation of the guides and examples, (d) turns Figma drift into a reviewed weekly event instead of a late discovery. | Proposed by the repository: `README.md`, `CONTRIBUTING.md`, `docs/decisions/0001`–`0005`. No numeric KPI declared (`open.item-011`) |
| `outcome.scope` | In scope | React components and their stories; design tokens and foundations; icons and pictograms with tracked provenance; the Figma catalogue (inventory, registry, parity cases, page census, rules) and its checks; the CLI tools for verification and alignment; the Storybook application with its guides; the Azure infrastructure of the catalogue; the agent-first flows that govern them. | Confirmed: package layout in `README.md`, `CONTRIBUTING.md` |
| `outcome.non-goals` | Out of scope | Dark theme (deferred, `ADR-0002`); writing to Figma (read-only by contract); product screens, templates and prototypes as a public surface; the product copy of consuming applications; replacing the existing applications; runtime support or hosting of the applications. | Confirmed: `README.md`, `AGENTS.md`, `docs/decisions/0002`, `docs/decisions/0004` |
| `outcome.constraints` | Relevant constraints | `UNLICENSED` repository; publication to GitHub Packages only; React 19 as a mandatory peer; light theme only; documentation and comments in English; Figma read-only; project declared **EXPERIMENTAL — NOT PRODUCTION-READY**; the DR/SRS `metadata.status` cannot be promoted autonomously. | Confirmed: `README.md`, `AGENTS.md`, `packages/pagopa-ui/package.json`, `LICENSE` |

<!-- id: solution-design -->

## Solution design — `Always`

### Technology profile and constraints — `Always`

| ID | Topic | Preference / constraint | Technology Radar outcome | Decision / derogation | Owner / status |
| --- | --- | --- | --- | --- | --- |
| `tech.profile.item-001` | CSP / hosting | Azure; the Storybook catalogue is served by an Azure Static Web App in `westeurope`. The library has no hosted runtime. | gap — the Technology Radar cannot be consulted from the repository | Confirmed by the infrastructure files; Radar outcome to be confirmed (`open.item-013`) | devex / confirmed |
| `tech.profile.item-002` | Language | TypeScript on the native compiler (TypeScript 7), types exported with the library | gap — Radar unavailable | Confirmed: root and package `package.json` | devex / confirmed |
| `tech.profile.item-003` | Runtime and UI platform | React 19 (`^19.2.0` as a peer), accessible Base UI primitives, Tailwind CSS v4 for styling | gap — Radar unavailable | Confirmed: `packages/pagopa-ui/package.json` | devex / confirmed |
| `tech.profile.item-004` | Architectural style | Layered Nx 23 monorepo: foundations (tokens, artwork) → components → catalogue → tools → application; import boundaries are checked by a dedicated check | gap — Radar unavailable | Confirmed: `ADR-0005`, `packages/ui-cli` (layer check) | devex / confirmed |
| `tech.profile.item-005` | Contract format | ES module per component, compiled CSS, type declarations and an API Extractor report; consumption through an npm package on GitHub Packages | gap — Radar unavailable | Confirmed: `packages/pagopa-ui/package.json` (`exports`), `etc/pagopa-ui.api.md`, `ADR-0002` | devex / confirmed |
| `tech.profile.item-006` | Managed cloud services | Azure Static Web App (catalogue), Azure Key Vault (delivery secrets), GitHub Packages (registry), GitHub Actions (verification and release) | gap — Radar unavailable | Confirmed: `infra/resources`, `.github/workflows` | devex / confirmed |
| `tech.profile.item-007` | Persistence | N/A — confirmed: no database and no managed store; the domain data are JSON files versioned in the repository | — | Confirmed: `packages/pagopa-ui/src/catalog/figma/` | devex / confirmed |
| `tech.profile.item-008` | Runtime observability | N/A — confirmed: the library emits no logs, metrics or traces; the operational signal is the outcome of the checks in CI | — | Confirmed: no telemetry code; `NFR-07` | devex / confirmed |

Scope note: everyday development tools (package manager, test runner, linter,
formatter, hooks) are excluded from this table by contract and reach the coding
agent as separate context.

### System context and dependencies — `Always`

`[Diagram or link: TBD — no C4 diagram in the repository (`open.item-019`)]`

| ID | Component / dependency | Responsibility | Interface or trust boundary | Status |
| --- | --- | --- | --- | --- |
| `solution.context.item-001` | "MUI Italia Next" Figma library | Source of truth for design: components, variants, device axes, variables, rules, comments | Read-only Figma API through a personal token or the read-only exporter | confirmed |
| `solution.context.item-002` | `pagopa/ui` GitHub repository | Code, catalogue, decision history and approval record | Git; pull requests protected by `CODEOWNERS` | confirmed |
| `solution.context.item-003` | GitHub Actions | Runs verification, deep checks, Figma drift, visual regression, release and deploy | Workflows on `pull_request` and on a schedule; secrets from the GitHub environment and Key Vault | confirmed |
| `solution.context.item-004` | GitHub Packages | The organisation's private npm registry that consumers install `@pagopa/ui` from | Publication authenticated with a GitHub App | proposed |
| `solution.context.item-005` | npmjs | Open source runtime dependencies (Base UI, `lucide-react`, `react-day-picker`, class utilities) | Public network at build time | confirmed |
| `solution.context.item-006` | Azure (Static Web App, Key Vault) | Hosts and serves the catalogue; holds the secrets used by delivery | Public HTTPS endpoint for the catalogue; secret access mediated by managed identities | confirmed |
| `solution.context.item-007` | Consuming applications | Adopt the components and determine their needs; provide React 19, the text dictionary and the link components | `peer` dependency; trust boundary on the DOM and on the React context | confirmed |
| `solution.context.item-008` | Design owner (person) | Decides on unpublished nodes, conflicting rules and design requests | Design requests written in `docs/design-requests/` and Figma comments | confirmed |

### Static component view — `If applicable`

`[Diagram or link: TBD — `open.item-019`]`

| ID | Component | Owns / consumes | Dependencies | Notes |
| --- | --- | --- | --- | --- |
| `solution.components.item-001` | `@pagopa/ui` | React components, public surface, text contract, context providers | tokens, artwork, Base UI, React 19 | The API report in `etc/` is the frozen contract of the surface |
| `solution.components.item-002` | `@pagopa/ui` — tokens | Manifest of variables and foundations, token CSS | Figma catalogue (variables), no runtime dependency | `schemaVersion 2`; 116 variables, 42 foundations, 31 deliberate exclusions |
| `solution.components.item-003` | `@pagopa/artwork` | Generated icons and pictograms, with a provenance registry | external sources (Material Symbols, Flaticon) | Provenance is a licence obligation (`NFR-05`) |
| `solution.components.item-004` | `@pagopa/ui-cli` | Checks (`figma:check`, `rules:check`, `api:check`, `foundation:check`, `layers:check`) and Figma tools (status, brief, plan, triage, rules, comments) | Figma catalogue, build artifacts | It is the alignment guard: without it drift cannot be detected |
| `solution.components.item-005` | Figma catalogue (data) | Inventory, node registry, parity cases, page census, rules, device policies and exceptions | committed Figma snapshots | 275 registry entries, 302 parity cases, 58 pages and 412 censused identities |
| `solution.components.item-006` | Storybook application | Navigable catalogue: stories, guides, interactive controls, the accessibility contract applied to every story | `@pagopa/ui`, tokens, artwork | 95 story files, 50 guides; deployed to Azure Static Web App |
| `solution.components.item-007` | Infrastructure | Azure environments of the catalogue, secrets, GitHub delivery environments | Azure, GitHub | Separates bootstrapper, repository and resources; it contains no product logic |
| `solution.components.item-008` | Agent-first orchestration | Skills, instructions and workflows that govern alignment, review and documentation | repository, CLI tools | `.agents/skills`, `AGENTS.md`, `figma-align` workflow |
| `solution.components.item-009` | Decision documentation | ADRs, plans, comparison reports, design requests | none | 5 ADRs, 2 dated reports, 1 improvement plan, 26 design requests |

### Domain model and glossary — `Always`

| Entity | Description | Key attributes | Relations | States / invariants |
| --- | --- | --- | --- | --- |
| Component | The consumable public unit: a React component exported with its story and its documentation | name, family, variants, maturity status | belongs to a family; is described by a registry entry; is covered by parity cases | Invariant: every public component appears in the API report and has at least one story and one reference guide |
| Family | Grouping by purpose of use (primitives, icons, input, navigation, feedback, content, data display, composites, overlays) | name, perimeter | contains components | Invariant: belonging to a family is not an inheritance hierarchy, it is a discovery classification |
| Figma node | A component or component set published in the Figma library, with a stable identifier | identifier, name, page, file version | belongs to a page; has or does not have a registry entry; is covered by parity cases | States: implemented, pending, excluded, mocked. Invariant: a `pending` or `conflicting` state is not closed without a decision from the design owner |
| Variant | A configuration of a node along an axis (size, state, tone, device) | axis name, accepted values | belongs to a node | Invariant: a variant with no implemented counterpart is a declared gap, not a silent absence |
| Device | A cross-cutting axis that distinguishes the mobile rendering from the others (explicit support or unsupported) | device class, policy, justified exception | concerns nodes and parity cases; is governed by a declared policy | Invariant: a divergence between devices is allowed only when recorded as a justified exception |
| Page | A container of the Figma file that groups nodes with the same purpose | name, number of published identities, read date | contains identities; is subject to census | Invariant: the library surface is complete only when every page has been read again after the last publication |
| Page census | The recorded reading of one page's surface, used to prove that nothing was left out | read date, listed identities, uncensused remainder | covers pages | Invariant: a published and uncensused identity is a residue that blocks the declaration of completeness |
| Registry entry | The record of a Figma node with the status of its processing and the link to the implementation | status, notes, references | refers to a node; may be covered by a bulk rule | Invariant: registry states describe the review of the node, not the state of the document nor the priority of a use case |
| Bulk rule | A rule applied to a homogeneous set of nodes (for example the icon and pictogram pages) instead of one by one | rule text, status (applied, pending, to be reviewed), affected nodes | covers several nodes; may be in conflict | Invariant: an unapplied rule makes the node that receives it incomplete |
| Parity case | A written check comparing an implemented variant with the corresponding Figma node, with the review outcome | node identifier, variant, outcome, review notes | refers to a node; produces coverage | Invariant: it counts as coverage only when reviewed; a draft does not count. Invariant: the case reflects the node, not the opinion of whoever wrote it |
| Parity coverage | The ratio between implemented nodes and nodes with at least one reviewed case | covered nodes, implemented nodes, remainder | derives from the parity cases | Invariant: the declared coverage does not include drafts; a node without a case is visible as a residue |
| Delta | The set of differences between two versions of the Figma file, detected through a design fingerprint | node, change kind, fingerprint before and after | generates alignment work; feeds the plan | Invariant: the fingerprint does not cover rules and comments, so no delta reports them |
| Drift | The divergence accumulated between the Figma library and the implementation, detected by the periodic comparison | affected nodes, detection date, review outcome | produces a review pull request; is governed by the approval process | Invariant: design approval is the merge of the drift pull request |
| Work order | The sequence in which the nodes of a delta must be worked, computed from the dependencies | ordered nodes, rationale of the order | orders the nodes of a delta | Invariant: a dependent node does not precede the node it depends on |
| Design request | A written question to the design owner about a node or a rule, with the expected answer | question, subject node or rule, status, answer | concerns a node or a rule | States: open, answered, closed. Invariant: a question stays in the document until it has a recorded answer or decision |
| Token | A named design value (colour, spacing, typography, radius, shadow, motion) | name, category, value per theme | derives from a Figma variable; is consumed by components | Invariant: a component uses no arbitrary values; exceptions are declared in a dedicated list |
| Foundation | A structured set of tokens that defines a visual language (typography, spacing, elevation…) | name, entries, alignment status | contains tokens | Invariant: a foundation is aligned only when the manifest and the drawing agree |
| Icon / Pictogram | A graphic artifact generated from an external source | name, source, licence, generation date | belongs to a set; has a provenance | Invariant: no artifact enters without a recorded provenance and licence |
| Story | An executable example of a component in the catalogue, with interactive controls | name, components involved, notes | refers to a component; is subject to the accessibility contract | Invariant: every story passes the accessibility contract, otherwise the check fails |
| Guide | A narrative document of the catalogue that explains when and how to use a component | title, components covered | refers to components and foundations | Invariant: a guide does not promise behaviour the component does not have |
| Text contract | The rule that every rendered or announced text is overridable by the consumer | message key, default value, override capability | concerns every component that renders text | Invariant: no text is hardcoded in the component without a key; Italian and English are provided |
| Green chain | The ordered set of checks that must pass before a change is considered valid | list of checks, order, outcome | governs every change to code and catalogue | Invariant: a check that cannot be run is declared as such and does not count as passed |
| Version plan | The record of changes awaiting release, with the declared semantic impact | packages involved, change kind, note | feeds the release | Invariant: no release happens without a plan entry declaring its impact |

| Term | Definition | Not to confuse with |
| --- | --- | --- |
| Node | A unit published in the Figma library, identified by a stable identifier | Component: the node lives in Figma, the component in the code; the registry is the bridge between the two |
| Registry | The list of entries that describe the processing of each Figma node | Inventory: the inventory captures what exists in the library, the registry captures what has been done with it |
| Node status | The review phase of a Figma node (implemented, pending, excluded, mocked) | Use Case status (`draft`/`ready`) and document status (`draft`/`review`/`baseline`): they are three different axes |
| Parity | The verified outcome of the comparison between implementation and drawing | Coverage: parity is a per-node outcome, coverage is the aggregate ratio |
| Delta | The difference between two versions of the file, measured by a fingerprint | Drift: drift is the divergence accumulated over time and reviewed periodically |
| Design fingerprint | A comparable summary of a node used to detect changes | Review: the fingerprint detects that something changed, not whether the change is correct |
| Read-only on Figma | The constraint by which the system reads the file and never writes to it | Absence of integration: the system is integrated and reads actively |
| Mocked | A node whose implementation is provisional and not yet aligned | Implemented: a node whose implementation is considered complete and verified |
| Census | The recorded and complete reading of one page's surface | Inventory: the census proves that nothing was left out of the inventory |

### Deployment and architecture view — `If applicable`

`[Diagram or link: TBD — `open.item-019`]`

| ID | Environment / boundary | Runtime placement | Scaling / resilience | Status |
| --- | --- | --- | --- | --- |
| `solution.deployment.item-001` | Pull request preview | Azure Static Web App, an ephemeral environment for every pull request that touches the catalogue | Created and destroyed by the workflow; no automatic promotion to production | confirmed |
| `solution.deployment.item-002` | Production catalogue | Azure Static Web App, `westeurope` region, served over HTTPS | Static site: scalability is delegated to the managed service; no availability objective declared (`open.item-015`) | confirmed |
| `solution.deployment.item-003` | Package registry | GitHub Packages (the organisation's npm registry) | Immutability per published version; no remote build cache (`open.item-012`) | proposed |
| `solution.deployment.item-004` | Consumer builds | The environments of the applications that adopt `@pagopa/ui` | The cost and the resilience of the design system show up in the consumers' build | confirmed |
| `solution.deployment.item-005` | Trust boundary of secrets | Azure Key Vault towards the GitHub delivery environments; GitHub App for publication | Rotation and revocation governed by the infrastructure; no credentials in the repository | confirmed |

### Assumptions, constraints, and trade-offs — `Always`

| ID | Type | Statement or decision | Impact | Owner / decision date | Evidence |
| --- | --- | --- | --- | --- | --- |
| `solution.decision.item-001` | decision | Design approval of an alignment is the merge of the drift pull request opened by the weekly workflow | The design owner approves through Git, not through a separate record; the repository history is the record | devex + design owner / 2026 (ADR-0001) | `docs/decisions/0001` |
| `solution.decision.item-002` | trade-off | The parity case corpus is a historical work list, not a gate: the gate applies narrowly to the perimeter of the delta | It keeps pre-existing debt from blocking every change, at the cost of a low aggregate coverage (87 of 244 nodes) | devex / 2026 (ADR-0004) | `docs/decisions/0004`, `parity-cases.json` |
| `solution.decision.item-003` | constraint | Light theme only: the dark theme is deferred to a later decision | No dark theme token is exposed; consumers cannot rely on one | devex / 2026 (ADR-0002) | `docs/decisions/0002` |
| `solution.decision.item-004` | constraint | The public surface is frozen until the first publication; every change goes through the API report and its review | API evolution is deliberately slowed so an unstable surface is not published | devex / 2026 (ADR-0002) | `docs/decisions/0002`, `etc/pagopa-ui.api.md` |
| `solution.decision.item-005` | constraint | Figma is read-only by contract: the system never writes to the file | Drawing corrections stay with the design owner; the system can only propose requests | devex / 2026 | `AGENTS.md` |
| `solution.decision.item-006` | assumption | The package will be consumed by internal PagoPA applications through GitHub Packages, not from the public npm registry | The `UNLICENSED` licence is consistent; a public publication would require a legal review | devex / to be confirmed (`open.item-006`) | `LICENSE`, `package.json` |
| `solution.decision.item-007` | trade-off | The graphic artifacts derive from external sources and the provenance is recorded, but one licence is still to be verified | Material Symbols is covered by a permissive licence; for the Flaticon pictograms the verification is open | devex / open (`open.item-003`) | `docs/decisions/0003` |
| `solution.decision.item-008` | trade-off | No remote build cache: every check rebuilds from scratch | Reproducibility and simplicity in exchange for verification time; the cost grows with the monorepo | devex / to be assessed | `docs/plans/improvements.md` |

### Make-or-buy and cross-Use-Case trade-offs — `Optional`

`make-or-buy` — The interactive and accessible primitives are bought (Base UI), as
are the icon base (`lucide-react`) and the calendar (`react-day-picker`); built
in-house are the styling layer on the tokens, the composition of the components,
the Figma catalogue and its instrumentation. The choice is justified by the
comparison report with MUI Italia: inheriting a Material UI v5 theme would have
preserved the starting problem (diverging customisations and no parity check),
while the primitives do not differentiate the product and are therefore to be
bought. The main cross-cutting compromise is between parity coverage and
maintenance cost: verifying all 244 implemented nodes would require an effort the
project has chosen not to sustain in one go, accepting a partial coverage and a
gate limited to the delta.

<!-- id: non-functional -->

## Non-functional requirements and compliance — `Always`

| ID | Area | Requirement / target | Verification evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| `NFR-01` | Performance | The distributed CSS respects the declared ceilings: 200000 raw bytes, 30000 bytes with gzip compression, 20000 bytes with brotli; every component is a separate ES module | CSS budget check in the green chain (`packages/ui-cli/data/css-budget.json`) | devex | enforced |
| `NFR-02` | Availability / SLO | The catalogue is served by a managed static service; no availability objective is declared | No availability threshold and no availability monitoring in the repository — gap (`open.item-015`) | devex | gap |
| `NFR-03` | Scalability | N/A — confirmed: there is no service with a load of its own; scalability is that of the managed static service and of the consumer builds | Static architecture; no application load served by the design system | devex | n/a |
| `NFR-04` | Security | Figma accessible only with a personal token or the read-only exporter; secrets only from Key Vault and GitHub environments; third-party actions pinned by commit; no credentials in the repository | Infrastructure misconfiguration check in CI; reviewed action configuration — no formal security review (`open.item-005`) | devex | partial |
| `NFR-05` | Legal / privacy | No personal data processed by the library; provenance and licence of every graphic artifact recorded; repository licence consistent with internal distribution | Artwork provenance registry; `UNLICENSED` licence; the Flaticon licence verification (`open.item-003`) and the legal confirmation (`open.item-006`) remain open | devex | partial |
| `NFR-06` | Business continuity / disaster recovery | N/A — confirmed for the runtime (no stateful service); recovery coincides with republishing from a tag | No catalogue recovery procedure documented — gap (`open.item-016`) | devex | gap |
| `NFR-07` | Monitoring / observability | N/A — confirmed: no runtime telemetry by choice; the operational signals are the workflow outcomes (verification, deep checks, drift, visual regression) | Scheduled workflows and their outcomes; no dedicated dashboard and no alerting | devex | partial |
| `NFR-08` | Accessibility / UX | Conformance to WCAG 2.2 AA intent: every story passes an automated accessibility contract (axe), adequate touch areas, reflow, forced-colours mode, respect for reduced motion | Accessibility contract applied to every story; dedicated guides; no manual audit recorded — gap (`open.item-004`) | devex | partial |

<!-- id: use-case-index -->

## Dynamic component view and Use Case index — `Always`

| ID | Title | Child page |
| --- | --- | --- |
| `UC-01` | As a design system developer, I implement a component starting from a published Figma node, so that the code matches the approved design | [UC-01](use-cases/uc-01-implement-component-from-figma-node.md) |
| `UC-02` | As a design system developer, I align an existing component to a Figma delta, so that the divergence does not accumulate | [UC-02](use-cases/uc-02-align-component-to-figma-delta.md) |
| `UC-03` | As a design system developer, I census a Figma page and update its surface, so that no published node is left out of the catalogue | [UC-03](use-cases/uc-03-census-figma-page-surface.md) |
| `UC-04` | As a design system developer, I update the tokens from the Figma variables, so that the visual language stays the one of the library | [UC-04](use-cases/uc-04-sync-design-tokens.md) |
| `UC-05` | As a design system developer, I propose an icon or a pictogram with its provenance and licence, so that the graphic artifacts are traceable | [UC-05](use-cases/uc-05-add-artwork-provenance.md) |
| `UC-06` | As a design system developer, I open a request to the design owner and record the answer, so that ambiguities do not become implicit decisions | [UC-06](use-cases/uc-06-open-design-request.md) |
| `UC-07` | As a PagoPA application developer, I install and consume the package, so that I build interfaces consistent with the library | [UC-07](use-cases/uc-07-consume-package-in-application.md) |
| `UC-08` | As a maintainer, I publish a new version of the package and declare its impact, so that consumers can upgrade safely | [UC-08](use-cases/uc-08-publish-package-version.md) |
| `UC-09` | As a maintainer, I deploy the Storybook catalogue as a preview and to production, so that guides and examples can be consulted | [UC-09](use-cases/uc-09-deploy-storybook-catalogue.md) |
| `UC-10` | As a maintainer, I manage a breaking change to the public surface, so that compatibility stays verified | [UC-10](use-cases/uc-10-manage-breaking-api-change.md) |
| `UC-11` | As a maintainer, I watch the weekly Figma drift and govern its review, so that design approves the divergences | [UC-11](use-cases/uc-11-govern-figma-drift.md) |
| `UC-12` | As a design system developer, I add to the public surface a component with no Figma node, so that the catalogue stays complete | [UC-12](use-cases/uc-12-add-component-without-figma-node.md) |

The child pages live in `use-cases/`, one per use case. This catalogue still
exposes no status, priority, components or acceptance criteria: they belong
exclusively to the child pages. Nine pages are `ready` and three — `UC-05`,
`UC-08`, `UC-09` — stay `draft` until the reviewer confirms their promotion;
publication to Confluence has not yet happened (`open.item-018`). The actors of
the pages are roles derived from the repository evidence, not a catalogue of
product actors: the assumption is recorded in `open.item-021`.

<!-- id: data-contracts -->

## Data and technical contracts — `If applicable`

| ID | Contract / entity | Type | Owner | Version / compatibility | Link | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `contracts.item-001` | Public surface of `@pagopa/ui` | package / API report | devex | `0.0.3`; surface frozen until the first publication; every change requires updating the report | `packages/pagopa-ui/etc/pagopa-ui.api.md`, `packages/pagopa-ui/package.json` | confirmed |
| `contracts.item-002` | Entry point of the tokens and of the CSS | package / theme | devex | Stable subpaths: the token module and the token and component stylesheets | `packages/pagopa-ui/package.json` (`exports`) | confirmed |
| `contracts.item-003` | Manifest of tokens and foundations | data contract | devex | `schemaVersion 2`; 116 variables, 42 foundations, 31 deliberate exclusions | `packages/tokens/src/manifest.json`, `foundations.json` | confirmed |
| `contracts.item-004` | Inventory of the Figma library | integration / data contract | devex | Bound to one version of the Figma file (`2415097349015371204`, read on 2026-10-28); 355 components | `packages/pagopa-ui/src/catalog/figma/inventory.json` | confirmed |
| `contracts.item-005` | Node registry | data contract | devex | 275 entries with node review states; schema stable across catalogue versions | `packages/pagopa-ui/src/catalog/figma/registry.json` | confirmed |
| `contracts.item-006` | Parity cases | data contract | devex | 302 cases over 90 distinct nodes; only reviewed cases produce coverage | `packages/pagopa-ui/src/catalog/figma/parity-cases.json` | confirmed |
| `contracts.item-007` | Census of the page surface | data contract | devex | 58 pages, 412 identities, recorded read date | `packages/pagopa-ui/src/catalog/figma/page-surface.json` | confirmed |
| `contracts.item-008` | Rules ledger and device policy | data contract | devex | Rules in English with a status; closed vocabulary for the device policy (support, update, exclusion) | `.../catalog/figma/rules.json`, `device-policy.json`, `device-exceptions.json` | confirmed |
| `contracts.item-009` | Text contract and message dictionary | integration | devex | Every rendered or announced text has an overridable key; Italian and English provided | `packages/pagopa-ui/src/lib/ui-provider/` | confirmed |
| `contracts.item-010` | Declared exceptions | data contract | devex | Exceptions of API surface, of alignment and of evidence, each with a reason | `.../catalog/figma/api-exceptions.json`, `evidence-exceptions.json` | confirmed |

### Data lifecycle and audit — `If applicable`

`contracts.data-lifecycle` — The domain data are JSON files versioned in the
repository: no personal data, no runtime collection, no external persistence. The
lifecycle coincides with the Git history: the inventory is bound to the Figma file
version it captured, the parity cases carry the review outcome, the rules ledger
carries the status of each rule. The audit events are therefore the merge of a
pull request (which for drift is the act of design approval), the workflow
outcomes and the design requests with their answer. Retention is the repository's
own, with no deadlines of its own: no artifact is removed, and an excluded node
stays tracked as an exclusion with its reason.

<!-- id: execution-readiness -->

## Execution, validation, rollout, and readiness — `Always`

### Delivery strategy — `Always`

| ID | Topic | Strategy | Evidence / owner | Status |
| --- | --- | --- | --- | --- |
| `execution.rollout` | Rollout / migration | Release by incremental versions: changes accumulate in a version plan, the plan generates a release pull request, publication follows the tag. The catalogue goes to production with the main branch; previews stay ephemeral and bound to the pull request. | `ADR-0005`, `CONTRIBUTING.md`, release workflow | confirmed |
| `execution.rollback` | Rollback / recovery | Republishing a previous version from the tag for the package; restoring the catalogue to the previous deployment of the static service. The catalogue procedure is not documented and must be written. | Gap (`open.item-016`) | gap |
| `execution.dependencies` | Delivery dependencies | Write permissions on GitHub Packages through a GitHub App; static service secrets in Key Vault; availability of the Figma token for live reads; production GitHub environment with approval | `.github/workflows`, `docs/figma-drift-secrets.md`, `infra/` | confirmed |

### Validation strategy — `Always`

| ID | Validation area | Scenario / evidence | Owner | Status |
| --- | --- | --- | --- | --- |
| `validation.e2e` | End-to-end | Complete green chain before every commit: installation, aggregate workspace verification, and the check that a consuming application really builds the package with the imported components | devex | confirmed |
| `validation.contracts` | Contract / integration | API report compared with the surface, Figma catalogue check, foundations check, import boundaries check, token and artifact check | devex | confirmed |
| `validation.nfr` | NFR / compliance | CSS budget, test coverage thresholds (90% statements and 83% branches globally, with stricter per-project thresholds), visual regression at three reference widths, accessibility contract for every story | devex | partial |
| `validation.operations` | Operational readiness | Weekly Figma drift with a review pull request; full nightly visual regression; nightly deep checks with additional engines. No restore exercise and no catalogue runbook. | devex | partial |

### Readiness gates — `Always`

**Review gate** (document-level) — `metadata.status` moves `draft` → `review` →
`baseline` only through this gate. The skill proposes the promotion with
evidence; a human reviewer confirms it.

| ID | Criterion | Evidence / status |
| --- | --- | --- |
| `ready.outcome-id` | `metadata.canonical-outcome-id` is present and stable | `PAGOPA-UI-DS`, assigned in this document |
| `ready.prd` | Linked PRD has owner, outcome, JTBD, KPI, and guardrails — or, for a direct DR/SRS intake, outcome and scope are in `Expected outcome` | Direct intake: outcome, scope, non-goals and constraints present in `Expected outcome`; numeric KPIs absent (`open.item-011`) |
| `ready.solution` | All `Always` sections are complete, or gaps are explicit; the technology profile is included | `Always` sections filled in; technology profile complete with the note excluding everyday tools; Technology Radar outcomes tracked as a gap (`open.item-013`) |
| `ready.domain` | The `Domain model and glossary` describes the solution entities, relations, states, invariants, and terms (by name, no identifiers), or records `N/A — <confirmed reason>` | 23 entities with states and invariants, 9 terms with the distinction from neighbouring terms; no identifiers, no schema |
| `ready.conditional` | Relevant conditional blocks are populated or marked `N/A — <confirmed reason>` | Static view, deployment view, contracts and data lifecycle populated; `Make-or-buy` included; appendices declared below |
| `ready.use-cases` | Use Case catalog has stable IDs and titles linked to child pages; each selected child declares its priority, status, and minimum core (trigger, main flow, at least one binary acceptance check on Must) or records a gap with an owner | Catalogue with 12 stable identifiers and titles; child pages present in `use-cases/`, nine `ready` and three `draft` pending human promotion (`open.item-018`) |
| `ready.discovery-links` | Figma/Service Blueprint links exist for user-facing work, or a gap is recorded | Figma linked with fileKey and snapshot version; Service Blueprint absent with a reason and a gap (`open.item-019`) |
| `ready.contracts` | Relevant API/event/data contracts are linked or recorded as explicit gaps with an owner | Ten contracts listed with link, version and status; no HTTP contract and no event, with a reason |
| `ready.reviews` | Privacy, security, accessibility, tracking, and support readiness are addressed, justified, or recorded as gaps with an owner; privacy/security gaps block only the production launch | Privacy justified and legal confirmation tracked; security review absent (`open.item-005`); manual accessibility audit absent (`open.item-004`); support not defined (`open.item-020`) |
| `ready.rfc-propagation` | Open or accepted RFCs are linked, and accepted decisions are propagated into this DR/SRS for the impacted slices | No RFC; the five accepted ADRs are propagated into `Expected outcome`, `Solution design` and `Delivery strategy` |

**Backlog gate** (per-Use-Case) — does not wait for the document review gate.
Each child Use Case page carries a single `draft` or `ready` status; it is
`ready` when it meets the minimum core, has a priority, names its components and
contracts (or a justified `N/A`), and names its domain entities and typed errors
(or a justified `N/A`). Downstream backlog generation consumes the `ready`
children; the DR/SRS catalog does not repeat their status. A status promotion is
confirmed by a human reviewer, not applied autonomously.

Current state: twelve child pages exist, nine are `ready` and three are `draft`;
the backlog gate is therefore passable for the nine `ready` pages and remains
blocked for the three `draft` ones until a human reviewer promotes them. The
promotion of this document to `review` is **proposed** with the gaps listed above
and awaits the confirmation of a human reviewer.

<!-- id: specialist-appendices -->

## Specialist appendices — `Optional`

`appendices` — Supporting material, which complements but does not replace the
preceding sections:

- `docs/reports/2026-10-25-mui-italia-comparison.md` — comparison with MUI Italia and the rationale of the platform choices.
- `docs/reports/2026-10-24-component-rules-gaps.md` — census of the design rules on the components: 43 rules, of which 11 applied, 14 documented, 12 gaps, 1 conflict, 5 to be clarified on the tokens.
- `docs/plans/improvements.md` — the priority improvement actions.
- `docs/figma-drift-handoff.md`, `docs/figma-drift-secrets.md` — drift runbook and secrets management.
- `docs/design-requests/` — 26 design requests with their answer.
- `GLOSSARY.md` — operating vocabulary of the alignment domain.

<!-- id: open-questions -->

## Open questions, assumptions, decisions, and change propagation — `Always`

| ID | Type | Item | Impact / blocker | Blocking | Owner | Decision or propagation date | Resolution / link |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `open.item-001` | question | Who owns the DR/SRS: `CODEOWNERS` points at `@pagopa/engineering-team-devex`, but the ownership of the document is not declared | Without an owner the review gate has nobody to confirm the promotion | no | devex | TBD | — |
| `open.item-002` | assumption | The authors of the document are marked TBD | Traceability of editorial responsibility | no | devex | TBD | — |
| `open.item-003` | question | The licence of the Flaticon pictograms (author SeyfDesigner) is not verified; Material Symbols is covered by a permissive licence | It blocks the distribution of the affected artifacts and the declaration of legal conformity | yes | devex | TBD | `docs/decisions/0003` |
| `open.item-004` | gap | No manual accessibility audit is recorded; the current guarantee is the automated contract on the stories | WCAG 2.2 AA conformance cannot be declared on automated verification alone | yes | devex | TBD | `NFR-08` |
| `open.item-005` | gap | No formal security review of the repository and of the supply chain | It blocks the declaration of production readiness | yes | devex | TBD | `NFR-04` |
| `open.item-006` | question | Legal confirmation that the `UNLICENSED` licence and distribution through GitHub Packages are consistent with the intended use | It determines whether the package can be made public or stays internal | no | legal | TBD | — |
| `open.item-007` | question | Seven Figma nodes are still awaiting a decision and one rule is in conflict | The surface cannot be declared complete until the design owner decides | no | design owner | TBD | `registry.json`, `rules.json` |
| `open.item-008` | gap | Parity coverage is 87 nodes out of 244 implemented | The verification debt is declared and not blocking for the delta, but it remains an alignment risk | no | devex | TBD | `docs/decisions/0004` |
| `open.item-009` | gap | The first publication of the package to GitHub Packages has not happened yet | Until it does, consumption by the applications is not verified end-to-end | yes | devex | TBD | `references.contracts` |
| `open.item-010` | gap | The documentation does not appear to be distributed in production | The promise of a consultable catalogue is not yet operational | no | devex | TBD | `solution.deployment.item-002` |
| `open.item-011` | gap | No PRD and no numeric success indicator | Reaching the outcome cannot be measured beyond the technical verification | no | product | TBD | `outcome.objective` |
| `open.item-012` | gap | No remote build cache: the green chain rebuilds from scratch | Verification time grows with the monorepo and discourages small changes | no | devex | TBD | `docs/plans/improvements.md` |
| `open.item-013` | question | The Technology Radar outcomes of the platform choices cannot be consulted from the repository | The derogations cannot be demonstrated; the choices stay confirmed only by the facts | no | devex | TBD | `tech.profile.*` |
| `open.item-014` | decision | The dark theme is deferred to a later decision | Consumers cannot plan support for a dark theme | no | devex | 2026 (ADR-0002) | `docs/decisions/0002` |
| `open.item-015` | gap | No availability objective for the catalogue | No SLO can be declared or verified | no | devex | TBD | `NFR-02` |
| `open.item-016` | gap | The catalogue recovery procedure is not documented | A deployment error has no written remedy | yes | devex | TBD | `execution.rollback` |
| `open.item-017` | assumption | No runtime telemetry by choice: consumers receive no usage signal from the components | Decisions about the most used components have no usage data | no | devex | TBD | `NFR-07` |
| `open.item-018` | gap | The child pages of the use cases have been generated in `use-cases/`; three stay `draft` and none is published to Confluence | Handover to the backlog can start from the nine `ready` pages; the three `draft` ones and the publication remain open | no | devex | TBD | use case catalogue |
| `open.item-019` | gap | C4 diagrams and a service blueprint of the adoption journey are missing | The joint product/design review relies on the textual description | no | devex | TBD | `references.service-blueprint` |
| `open.item-020` | question | Ownership, channel and response times of the design requests are not declared | The 26 existing requests have no service agreement guaranteeing their closure | no | design owner | TBD | `docs/design-requests/` |
| `open.item-021` | assumption | The actors of the child pages are roles derived from the repository evidence: there is no catalogue of product actors | If a PRD introduces an actor catalogue, the child pages must be realigned to the authoritative names | no | product | TBD | `use-cases/` |

Change propagation: there is no approved baseline yet, so no uncertainty in this
table is a Change Request: they are gaps and open questions. Once the baseline is
approved, a material change of behaviour, scope or contract will require a
`CR-YYYY-NNN` with the artifacts involved and its propagation here and in the
affected child pages.
