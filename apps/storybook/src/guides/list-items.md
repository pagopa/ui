`ListItem` maps the Figma `Type` axis to `variant`: `Informative`, `Link`,
`Actionable`, `Transactional`, `Amount`, `Error` and `Skeleton`; the two avatar
combinations are the same variants with a `leading` avatar. The caller owns the
copy: `description`, `value`, `chip`, `suggestion`, `amount`, `helperText` and
`action`.

The row is edge-to-edge: it has no inline padding, and the container owns the
horizontal inset. `primary` marks the value of the link and actionable rows.

An interactive row is a native `button` when `onPress` is set and a native anchor
when `href` is set; the chevron is decorative (`aria-hidden`). The skeleton row
is an `aria-busy` container with the row's own rhythm.
