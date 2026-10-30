`SectionHeader` renders the source anatomy and nothing more: an optional
decorative icon, the title with its optional source `Chip` as `status`, and
trailing `actions`. There is no eyebrow or description slot; compose supporting
copy outside the header.

`titleAs` chooses the heading element (default `h1`); `level` (1-3) chooses the
visual size. `level={1}` already carries the source bold face, so do not add a
semibold utility on top of it. Below `sm` the chip stacks under the title and the
icon aligns to the top; from `sm` they share one centred row. The icon is
decorative, and the trailing actions are caller-owned native controls.
