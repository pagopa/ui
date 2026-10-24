# Design request

One question the source cannot answer becomes an issue for the design owner, a
review story when it is visual, a record at `design.requests` and a ledger entry
that points at the record. The issue carries the conversation; the record is
what a later session reads. The node stays `pending` until the answer is
recorded.

## When

Open a question when the source leaves it to a person:

- a value, gap or size with no source and no token owner ([tokens.md](tokens.md));
- a behaviour or state the source does not draw (what happens when …);
- a device composition that contradicts the declared contract (a mobile frame
  that is not a device width, an axis value that names a page position);
- a mapping that would change the public API or a shared component;
- a rule that contradicts the drawing, or whose new text is ambiguous.

When the source answers the question, decide it and record it in the registry
note. A design request is for the question the source leaves open.

## The four steps

1. **Preview.** A visual question with two or more plausible options earns one
   review story on the review pull request, on `design.preview.branch`: title
   `Reviews/<slug>`, tags `['!dev', '!test', '!autodocs']`, the options side by
   side at 320 and 1200, built as a standalone composition. That pull request is
   the only one and owns the single preview environment: its body indexes
   `slug` → issue URL, it changes review stories only, and it stays open and
   unmerged for the life of the questions. When two options would need competing
   component code, the composition shows the visual consequence and the issue
   says the implementation follows the answer; when a composition cannot show
   the option, the question waits or becomes a developer decision without a
   preview.
2. **Issue.** `gh issue create` with a body file from the design-question
   template; a developer-only question uses the dev-decision template and no
   preview. One decision per issue; a question that opens another one gets its
   own issue and a link. Labels: `type/design-question` or `type/dev-decision`,
   `status/needs-answer`, and `source/figma-rules` when a rules card raised it.
   Assign every handle in `design.owners`. A visual question links to
   `<design.preview.url>/?path=/story/reviews-<slug>`, and the link enters the
   review pull request index.
3. **Record.** Write `design.requests` at `<yyyy-mm-dd>-<slug>.md` with the
   type, the issue URL, the status, the decision owner and the preview. Name it
   in the node's registry note, which carries the status and the pointer.
4. **Ledger.** Point the rules card at the record with `figma:rules --mark`
   ([rules.md](rules.md)). The `request` field keeps card and record joined
   after the issue closes.

## Writing the issue

Design questions follow Simplified Technical English: short sentences, one idea
per sentence, active voice, plain words. Product words, device names and pixel
measurements are fine. Technical detail — file paths, class and prop names,
framework names, test names, code blocks — lives inside the collapsed technical
section. The preview shows the visual options; prose stays on the one question.
Every issue carries a recommendation: a designer may disagree, and starts from a
proposal.

## Answering and closing

A person starts the session. Process answers with
`gh issue list --label status/answered --state open`; the waiting list is
`gh issue list --label status/needs-answer --state open`. Nothing runs in the
background.

When the issue is answered, set the record to `answered` with the decision,
implement it, update the component guide and the ledger, remove its review story
from the review pull request, update the index, comment the commit link on the
issue and close it.

## The record

```md
# <Question>

- Type: design | dev
- Issue: <issue url>
- Status: open | answered
- Decision owner: <handles>
- Preview: <url>

## Context

## Options

## Decision
```

**Done when** the issue exists with its labels and owner, the record carries the
issue URL, the card's ledger entry points at the record, and the node's registry
note names the record while the node stays `pending`.
