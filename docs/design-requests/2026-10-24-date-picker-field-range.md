# Design request — DatePickerField: does it need a dal–al range trigger?

- Type: design
- Issue: https://github.com/pagopa/ui/issues/28
- Status: open
- Decision owner: @gunzip
- Preview: none (the range panel already exists in the `DatePicker` stories)
- Figma node: `8049:39452` (the mapped `DatePicker` panel)
- Comment thread: `1745170530` (2026-05-04)

## Context

The thread records a request for a period field: Eileen asks for "un arco
temporale (dal - al)" and Elena replies that there are several options and asks
for context. `DatePicker mode="range"` is implemented and storied; the field
wrapper `DatePickerField` accepts one ISO day, so a period must be composed from
`Popover` and the range panel by hand. The thread records no final "yes", so a
public range API would be a guess.

## Options

1. **Keep the single-day field.** A period stays a product composition. No new
   public API.
2. **Add a range trigger.** `DatePickerField` accepts `from`/`to`, formats the
   period, keeps the hidden form values and opens the existing range panel, or a
   separate `DatePickerRangeField` does it.

## Decision

Pending. Option A is the recommendation until a product confirms the need; the
implementation is skipped.
