# Design request — Popper: is the status card an inline dismissible notice or an anchored popover?

- Type: design
- Issue: https://github.com/pagopa/ui/issues/68
- Status: answered — issue closed; implementation and source variants reviewed
- Decision owner: @gunzip
- Preview: `apps/storybook/src/Popper.stories.tsx`; the candidate drawings are in Figma (`13211:26152` and `9927:36954`)

## Update — 3 November 2026

The current Popper set draws four `Status` values (Error, Warning, Info and
Success) crossed with three `Pointer` positions (Left, Center and Right). Each
variant is 312x96: a 24x20 pointer above a 312x76 status card. The design owner
confirmed in the Figma comment thread that the pointer and position variants
were added to indicate the related element. The 1200px page examples show the
card floating over page content.

The refreshed page rule describes a temporary validation message associated
with its field, announced with that field, and dismissed by its close action or
when the value is corrected. It is imported into the Popper consumer guide.

This supersedes the earlier no-arrow premise and rules out treating the drawing
as an inline-only notice. On 3 November the decision owner chose a distinct
`Popper` component, separate from `Popover` and inline `Alert`. The decision was
recorded in issue #68, which is closed. The distinct component and all twelve
source variants have since been reviewed.

The sections below preserve the 28 October evidence and options; their
no-arrow description and 312x76 overall size are historical, not the current
source contract.

Date: 28 October 2026. Origin: the drift delta of 28 October (Figma drift
PR #64, milestone M5), node `13211:26152`, in the pinned export
`v2415097349015371204`. Figma was not modified: the measurements below come from
the pinned inventory.

The node stays `pending`; this request is named in its registry note. The
candidate implementations are
[alert.tsx](../../packages/pagopa-ui/src/components/primitives/alert.tsx) and
[popover.tsx](../../packages/pagopa-ui/src/components/overlays/popover.tsx).

## Why

The set draws one card in four severities: 312x76, radius 8, a 1px border, a
16px inset, a 24px status glyph, a 16/22 body that fills 216 of the 312 and a
24px close mark. Its colours are bound to variables and are the `status-*`
ramp, which is what `Alert`'s four variants already read:

| Variant          | Node          | Glyph          | Soft      | Border    | Foreground | The library today             |
| ---------------- | ------------- | -------------- | --------- | --------- | ---------- | ----------------------------- |
| `Status=Status2` | `13211:26809` | `warning`      | `#fff5da` | `#ffd56b` | `#614c15`  | `Alert variant="warning"`     |
| `Status=Status3` | `13211:26880` | `info`         | `#e1f5fe` | `#89d9fc` | `#215c76`  | `Alert variant="info"`        |
| `Status=Status4` | `13211:26923` | `check_circle` | `#e1f4e1` | `#89d188` | `#224021`  | `Alert variant="success"`     |
| `Status=Status5` | `13294:26980` | `report`       | `#ffd9d9` | `#ff6666` | `#5d1313`  | `Alert variant="destructive"` |

So the question is not what the card looks like — `Alert` already draws that
geometry down to the 8px gap and the 24px glyph — but where it lives: in the
page as a dismissible notice, or in an overlay anchored to a trigger.

## Evidence

- `Alert` is `rounded-lg border p-4`, `gap-x-2`, a `size-6` glyph, four
  severities reading `--{info,success,warning,error}-{soft,border,foreground}`.
  Those three semantic tokens resolve to `status-<severity>` 100 / 400 / 850,
  the four triples above. Nothing about the card needs a new token.
- What the card adds to `Alert` is the close mark. Nothing else.
- The card has no shadow (`effects: []`), no arrow and no Info glyph, while the
  reviewed `Popover` is a white card with `shadow-32`, an arrow and a
  `Top`/`Bottom` placement.
- The set's description is a byte-identical copy of `Popover`'s: same
  `[COMPONENT DESCRIPTION: InfoPopover]` header, same "ancorato a un'icona Info
  (i)", same `Placement: Top | Bottom` with an arrow, same fixed 280px content
  width. The drawing contradicts all of it: the set declares no `Placement`
  property (only `Status` and the `✏️ Descrizione novità` text), no arrow is
  drawn, the content is 312 wide rather than 280, and the glyph is a severity
  rather than an Info mark.
- A description that requires a property the set does not declare is not the
  description of that set. It is the strongest evidence that `Popper` and
  `Popover` were never meant to be one node, and it is why this is a question
  and not a mapping.

## The open question

- Does the card float anchored to a trigger, arrow pointing at it, as the
  description insists — or does it sit inline in the page and simply be
  dismissed?
- If it floats: does `Popover` take the severity, keeping its arrow and its
  `Top`/`Bottom` placement? The four variants would become a severity axis on
  the reviewed component, and the node becomes an `additionalTargets` of
  `9927:36954`.
- If it sits inline: does `Alert` gain a dismissible form, with the close mark
  and the label it announces? The node maps to `Alert`, and the `InfoPopover`
  description is removed from it.
- Or is it a composition of both, with a name of its own?

## Options

1. **`Popover` gains a severity** (one component, arrow kept, `arrowPosition`
   already exists). Highest reuse of a reviewed component; needs an answer on
   whether a severity card keeps the arrow.
2. **`Alert` gains a dismissible form** (one component, no overlay). The drawing
   supports it today; the cost is a close affordance and an announced label on
   a primitive that never had one.
3. **A new `InfoPopover` composes both.** No change to either primitive, a third
   public surface, and the parity case for these four variants lands on a
   component that exists only for them.

A recommendation is an option, not a decision. This record recommends option 2:
the card is `Alert`'s content plus a close mark, and the description it carries
belongs to the other set.

## What is already fixed

- The four severities and their tokens: `status-warning|info|success|error`
  100 / 400 / 850, reached through the semantic `-soft` / `-border` /
  `-foreground` triple that `Alert` reads today. Nothing here re-opens the
  foundations.
- The geometry: radius 8, 1px border, 16px inset, 8px gap, 24px glyph, 16/22
  body, 24px close, 312 wide with the body taking 216.
- The anchored, closable, arrowed card itself, reviewed under `9927:36954`.
