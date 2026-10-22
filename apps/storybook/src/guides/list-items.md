`ListItem` maps the Figma `Type` axis to `variant`: `Informative`, `Link`,
`Actionable`, `Transactional`, `Amount`, `Error` and `Skeleton`; the two
avatar combinations are the same variants with a `leading` avatar. The caller
owns the copy: `description`, `value`, `chip`, `suggestion`, `amount`,
`helperText` and `action`.

The source row is edge-to-edge. It has 12px block padding and no inline
padding, a 12px gap between the slots, and the container owns the horizontal
inset. The `Content` stack is 6px for the informative, link and actionable rows,
2px for amount and transactional, and 0 for error. The leading slot is 24px for
an icon and 44px for an avatar; the source `Description+value` block is a 0px
stack (2px on amount and transactional), the chip is 24px, the chevron is 24px
and the amount is 16/22 Semibold primary. The `Informative + CTA` action is a
16/22 text action 22px tall — not a 48px control — whose 44px pointer target
comes from the invisible `::after`; a `primary` value marks the link and
actionable rows.

An interactive row is a native `button` when `onPress` is set and a native
anchor when `href` is set; both keep the row's own line heights, and the chevron
is decorative (`aria-hidden`). The skeleton row is an `aria-busy` container with
the same 12px block rhythm. The `Transactional` source hides its `Suggestion`
layer, so the parity fixture does not render it; `WithSuggestion` keeps the prop
visible for the component contract.
