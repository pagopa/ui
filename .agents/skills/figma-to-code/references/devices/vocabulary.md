# Device vocabulary

A published set that declares a device axis draws one composition per device. The
alignment covers every declared device, each read from its own variant and
captured at that variant's width; the mobile composition is never inferred from
the desktop one. Nothing here is keyed by a component: the devices come from the
set's axis, the width from the variant's box, the technique from the case.

`catalog.devicePolicy` maps every declared axis value (`Desktop`, `MDDesktop`,
`XS Mobile`, `Device5`, …) to `mobile`, `tablet`, `desktop`, or `any` (one
composition everywhere, no case needed). An axis is a device axis by its values,
not its name. The policy is vocabulary only: never a component name, path or
decision.

| Device | Capture width | The implementation uses |
| --- | --- | --- |
| `desktop` | the variant's box | the row composition |
| `tablet` | the variant's box | the desktop or the mobile composition: pick and record |
| `mobile` | the variant's box | the collapsed composition |
| `any` | — | one composition everywhere |

The capture width is read from the variant (`nodeSpec(variant).box.width`); the
policy holds a canonical width only for an alias that carries none. A new source
alias goes into the policy.

`pnpm nx run pagopa-ui-cli:check:devices` decides the rest — an unmapped value, a
duplicate alias and an unused axis fail, an unused alias and a device-like value
on a non-device axis warn — and every error names the fix and the command. The
policy is edited by hand: the check reports, it never invents a mapping.

Next: [scope.md](scope.md) decides viewport or container; [loop.md](loop.md) runs
the device work and closes the coverage.
