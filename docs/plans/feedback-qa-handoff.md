# Feedback and Q&A — handoff plan

Status: ready to execute. Audience: a coding agent starting a clean session in
this repository. No prior context is needed; this file is the whole brief.

## Goal

Give designers and design-system developers a simple way to answer the
questions the agents raise, using GitHub issues in this repository, with a live
Storybook preview of the possible choices. The agent opens the questions and
records the answers; the person starts every session by hand.

The mechanism must stay small: no new CLI commands, no deterministic format
checks, no automation. GitHub CLI plus the existing Storybook preview pipeline
is enough.

## Verified facts

- `release-storybook.yaml` deploys the Storybook to Azure Static Web Apps for
  every pull request that touches `apps/storybook/**`, `packages/pagopa-ui/**`,
  `packages/artwork/**`, `packages/tokens/**` or the lockfile. `main` goes to
  production, a closed pull request deletes its preview environment.
- Azure Static Web Apps **Standard allows 10 preview environments per app**
  (Free 3, Dedicated 20 and retired). The repository app is Standard
  (`infra/resources/dev/static_web_app.tf`). Source:
  <https://learn.microsoft.com/azure/static-web-apps/quotas>.
- The preview URL is stable for the life of the pull request. The deploy action
  posts a bot comment that starts with `Azure Static Web Apps: Your stage site
  is ready!`; the DX workflow keeps only the newest one.
- One long-lived review pull request can therefore own one preview environment,
  and its URL can live in the configuration. Once the URL is written there, the
  agent never waits for a deploy or reads a comment to compose a link.

## The single review pull request

Use **one** long-lived pull request. There is never a second review PR and no
per-batch mode: one environment, one index, one slot.

- Branch: `feedback/previews`.
- Title: `chore(feedback): review previews for open design questions`.
- Label: `do-not-merge`. Never merge it.
- The pull request body is the index: a table of `slug` → issue URL, updated
  when a question opens or closes.
- Only files under `apps/storybook/src/reviews/` change. No component, token or
  test code. This keeps the preview reproducible and avoids a second source of
  truth.

### Why one is enough

The preview is a static Storybook; the questions are visual choices, not code
branches. One environment shows every open choice at once, which is also easier
for a designer: one link, one navigation.

### Contraindications and mitigations

| Risk                                                                | Mitigation                                                                                                                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| The branch drifts from `main` and the preview shows old components. | Rebase `feedback/previews` on `main` before adding or changing a story.                                                                           |
| Every push runs the full pull-request CI.                           | Accept it; the review PR changes only stories, and the `!test` tag keeps them out of the story suite. Push once per group of new questions.       |
| One broken story breaks the build for every open question.          | Keep the stories small and self-contained; check the build once after a push.                                                                     |
| The stories accumulate and the branch becomes a junk drawer.        | Remove a story when its question closes. The PR body stays the index.                                                                             |
| Closing or recreating the PR kills every link and changes the URL.  | Do not close it. If it must be recreated, update `design.preview.url` in the same change.                                                         |
| The PR occupies one of the ten preview slots forever.               | That is the point: one slot for all questions. Keep the total storybook PRs under eight.                                                          |
| The preview shows the choice, not the implementation.               | Review stories are standalone compositions. They show A/B/C, not component code; the chosen option is implemented later, in its own pull request. |

**The review pull request is always exactly one.** Never open a second review
PR for a group of questions. Two situations are handled inside that PR, not by
splitting.

- **Many open visual questions.** One story per question is fine. When the
  preview grows crowded, add a `Reviews/Index` story that links the open
  questions, keep the titles ordered by area, and remove the stories of closed
  questions. About ten open stories is a curation guideline, not the Azure
  limit (one PR always uses one environment): beyond it the build and the index
  get slower, so curate more, not split.
- **Two questions need different versions of the same component code.** The
  review PR is story-only and never carries component code. Show the choice as
  a standalone composition, or through a prop and state the current component
  already supports. If an option needs a code change to be visible, show its
  visual consequence in a composition and say in the issue that the
  implementation follows the decision. If two options cannot be represented
  without competing code, the second question waits until the first is
  answered, or becomes a developer decision with no preview. A second PR is
  never the answer.

For example, Shadow 32 and ButtonGroup spacing are compositions and live
together. The Drawer "bottom sheet automatic" and "direction caller-owned"
options are two versions of the same file: the preview shows the visual
consequence, and the implementation follows the answer.

## Triggers

Nothing runs in the background: no cloud agent and no scheduled issue creation.
A local, interactive session is the unit of work; the triggers are instructions
in the skills, executed when a session runs.

A session opens a question when:

- the node brief shows a rule in `conflict` or `deferred`, or a `stale` rule
  whose new text is ambiguous;
- `figma:rules --plan` or `figma:status` reports a node that cannot be closed
  without a decision;
- the source contradicts itself (description against drawing), or the drawing
  does not define a behaviour the rule requires;
- a parity or device review cannot close a case without a source decision;
- a component task needs a visual or API choice the source does not settle, and
  the answer changes what the user sees or the public contract.

The agent then writes the record, opens the issue and assigns `design.owners`.

A session adds a review story when the question is visual and has two or more
plausible options that a rendered comparison answers faster than prose.
Developer decisions and text-only questions skip the story. The story goes to
the single `feedback/previews` pull request.

A session implements an answer when a person starts it to process answered
issues. The agent records the decision, implements it, updates the guide and the
ledger, and closes the issue. The recommended session start is
`gh issue list --label status/answered --state open`; the waiting list is
`gh issue list --label status/needs-answer --state open`.

No scheduled job opens an issue. The weekly Figma drift job reports drift; it
does not create questions.

## Configuration

Add these keys to `packages/pagopa-ui/figma-to-code.yaml`:

```yaml
design:
  # The durable record of each question, one file per slug.
  requests: docs/design-requests
  # GitHub handles. The same owners for the whole design system.
  # For now only `gunzip`; add handles to the array when they are known.
  owners:
    - gunzip
  # The long-lived review pull request and its stable preview.
  preview:
    url: https://<preview-host>
    pr: 42
    branch: feedback/previews
```

The preview link of a question is:

```text
<design.preview.url>/?path=/story/reviews-<slug>
```

`<slug>` is the story title after `Reviews/`, lower-case and hyphenated (for
example `Reviews/Shadow 32` → `reviews-shadow-32`). The agent writes the link in
the issue; it does not need the hostname from a comment.

Bootstrap once: create the review PR, let the first deploy finish, read the URL
from the bot comment, write it in the configuration. After that, no waiting.

## The question lifecycle

The agent session is local and interactive. The person starts it; there is no
cloud agent and no scheduled job.

1. **Decide the question.** One decision per issue. If a question opens another
   one, open a separate issue and link it.
2. **Add the preview (visual questions only).** Create
   `apps/storybook/src/reviews/<slug>.stories.tsx` with title `Reviews/<slug>`,
   tags `['!dev', '!test', '!autodocs']`, and the options side by side at 320
   and 1200. Push to `feedback/previews`. The preview deploy updates.
3. **Write the issue.** Use `gh issue create` with a body file. Pick the
   template for the audience:
   - `design-question.md` — designers; simple English, no technical detail;
   - `dev-decision.md` — design-system developers; technical detail allowed.
4. **Assign.** Design questions: all handles in `design.owners`. Developer
   decisions: the maintainers (CODEOWNERS team) or the person.
5. **Label.** `type/design-question` or `type/dev-decision`, plus
   `status/needs-answer`. Add `area/<family>` when useful.
6. **Record the answer.** When the issue is answered, write the decision in
   `docs/design-requests/<date>-<slug>.md` (`status: answered`,
   `issue: <url>`, `decision: …`), update the guide and the ledger
   (`figma:rules --mark … --request docs/design-requests/<date>-<slug>.md`),
   comment the commit link on the issue and close it.
7. **Clean the preview.** Remove the story, push, and update the PR index.

No `feedback:*` commands. Use `gh issue list`, `gh issue create`,
`gh issue comment`, `gh issue close`, `gh pr view`.

## Issue templates

Create two markdown templates (issue forms are not usable from `gh` with a
pre-filled body):

### `design-question.md`

```markdown
## What we are deciding

One sentence.

## Why it matters for the people who use the product

What changes for them.

## The options

**A — …** [See it in the preview](preview-url)
**B — …** [See it in the preview](preview-url)

## What we recommend

One option, and why.

## What we need from you

One question, answerable in one comment.

## When

A date, or "does not block the release".

<details><summary>Technical context for the team</summary>

Implementation notes, files, and constraints. Designers can ignore this section.

</details>
```

### `dev-decision.md`

```markdown
## Decision

One sentence.

## Context

What forces the choice.

## Options

A/B/C with the API, test and parity impact.

## Recommendation

One option, and why.

## What we need from you

One question.

## When

A date, or "does not block the release".
```

Labels to create once with `gh label create`:

`type/design-question`, `type/dev-decision`, `status/needs-answer`,
`status/answered`, `source/figma-rules`, and `do-not-merge` for the review PR.

## Language

All issues are in English. Design questions follow ASD-STE100 Simplified
Technical English: short sentences, one idea per sentence, active voice, no
jargon.

Rules for a design question:

- No file paths, class names, property names, framework names, test names or
  code blocks outside the collapsed technical section.
- Product words, device names and pixel measurements are fine.
- Use the preview for anything visual; do not describe a layout in prose if a
  picture can show it.
- One question per issue.
- A recommendation is mandatory; a designer can disagree, but starts from a
  proposal.

No format check exists. The agent is trusted; the first few issues are read by
the person as calibration.

## Durable record and ledger

The issue is the conversation; the repository is the record. Keep one file per
question in `docs/design-requests/`, named `<yyyy-mm-dd>-<slug>.md`, with:

```markdown
# <Question>

- Type: design | dev
- Issue: <url>
- Status: open | answered
- Decision owner: <handles>
- Preview: <url>

## Context

## Options

## Decision
```

The existing `design.requests` configuration already points at that folder. The
ledger `request` field points at the record, not at the issue; `figma:rules
--check` keeps verifying that the record exists. Add the issue URL to the
record so a reader can find the conversation.

## Bootstrap steps for the new agent

1. Read this file, `AGENTS.md`, and
   `.agents/skills/figma-to-code/references/rules.md`.
2. Add `Reviews` to the story-taxonomy allowlist in
   `packages/ui-cli/tests/checks/story-taxonomy.test.mjs`, with a comment that
   review stories live only on `feedback/previews` and never merge. Run
   `pnpm nx run pagopa-ui-cli:test`.
3. Add the `design.owners` and `design.preview` keys to
   `packages/pagopa-ui/figma-to-code.yaml`; document them in
   `.agents/skills/figma-to-code/references/init.md`.
4. Create the two issue templates and the labels.
5. Create the `feedback/previews` branch and the review pull request with the
   first group of stories (the three visual questions below). Wait once for the
   deploy, copy the URL into the configuration, and keep the PR body as the
   index.
6. Open the six pilot issues:
   - design: Shadow 32 scope, ButtonGroup spacing, ProgressKpi group;
   - dev: Snackbar placement, Snackbar timing, Button disabled variant.
     Use the existing records in `docs/design-requests/2026-10-24-*.md` and
     `docs/plans/component-rules-open-decisions.md` as the source.
7. Update `.agents/skills/figma-to-code/references/design-request.md` to this
   flow (issue → preview → record → ledger) and remove any old wording about
   files that no agent reads.
8. Run the green chain before finishing. Do not commit if the person has not
   asked; report the files and the issue links.

## Acceptance

- The preview URL in `figma-to-code.yaml` opens the Storybook; a story URL
  composed from it renders.
- The six issues exist, in English, labelled, assigned, and linked from the
  review PR index.
- Each design issue has a preview link; each dev issue has the technical
  context it needs.
- The skill explains the flow and the language rules; no `feedback:*` command
  exists.
- The green chain passes.

## Out of scope

- Cloud agents, scheduled sessions, or automated issue creation.
- Deterministic checks on the issue body.
- A `feedback:status` command; query GitHub with `gh issue list`.
- Changing Figma, the components or the rules in this plan. The chosen options
  are implemented separately, after the answers.
