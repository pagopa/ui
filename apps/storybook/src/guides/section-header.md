`SectionHeader` renders the source anatomy and nothing more: an optional
decorative icon, the title with its optional source `Chip` as `status`, and
trailing `actions`. There is no eyebrow or description slot; compose supporting
copy outside the header.

The caller chooses the heading element with `titleAs` (default `h1`) and the
visual level with `level` (1–3, from the largest to the smallest). Each level
maps to the generated type-scale tokens with its source line height and face;
the level 1 token already carries the source Bold face, so do not add a
semibold utility, which selects the wrong face. On the narrow grid the chip
stacks below the title and the icon aligns to the top; from `sm` they share one
centred row. The icon is decorative; the trailing actions are caller-owned
native controls (an icon button or a text button).
