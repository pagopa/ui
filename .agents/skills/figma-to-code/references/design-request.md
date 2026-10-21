# Design request

A design request records one question the source cannot answer. The Figma design
owner answers it; the node stays `pending` until the answer is recorded. It is
not a bug report, a decision or a place to absorb a guess.

## When

Write one when the source leaves a question only the design owner can answer:

- a value, gap or size with no source and no token owner ([tokens.md](tokens.md));
- a behaviour or state the source does not draw (what happens when …);
- a device composition that contradicts the declared contract (a mobile frame
  that is not a device width, an axis value that names a page position);
- a mapping that would change the public API or a shared component.

When the source answers the question, decide it and record it in the registry
note. A design request is for the question the source leaves open.

## Where

The path is `design.requests` in `figma-to-code.yaml`. Name the file
`YYYY-MM-DD-<slug>.md`, one request per file. Keep the node `pending` and name
the request in its registry `note`; the request carries the full question, the
note carries the status and the pointer.

## The document

Write for a designer who has not run the tooling. Plain words, no tool jargon.
Point at the node with its Figma URL (`figmaNodeUrl`), not a screenshot alone.
State what is blocked today, what the options are and what the follow-up is.

```md
# <The question in one line>

- Node: [<name>](<figmaNodeUrl(nodeId)>) (`<nodeId>`)
- Page: <page>
- Status: open — the node stays `pending`
- Decision owner: Figma design owner

## Context

What the component is and the screen or state the question is about, in two or
three sentences.

## The open question

The question or questions the source does not answer. One question per bullet.

## Why it matters

What is blocked today (the node, a device case, a consumer), what happens if we
guess, and the follow-up once the answer arrives.

## Options

The options the source suggests, with the trade-off of each. A recommendation is
an option, not a decision.

## What is already fixed

The constraints that are not in question: tokens, contract, other devices.
```

**Done when** the file exists at `design.requests`, it links the node, states
the open question and its impact, names the decision owner, the registry note
names the request, and the node is `pending`.
