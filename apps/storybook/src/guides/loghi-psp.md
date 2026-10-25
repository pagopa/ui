<!-- component-rules:start -->

## Component Rules

- Place the logos 24px from the bottom and right edge of the viewport.

<!-- component-rules:end -->

# Loghi PSP

`LoghiPSP` implements the Figma component set `382:7640`. Each `brand` value
renders one pinned, source-colour logo; the default alternative text is the
brand name, and pass `alt` only when a more useful label is needed in context.

| `brand` value  | Figma source variant | Node ID    |
| -------------- | -------------------- | ---------- |
| `mastercard`   | Mastercard           | `382:7435` |
| `maestro`      | Maestro              | `382:7437` |
| `visa`         | Visa                 | `382:7439` |
| `amex`         | Amex                 | `382:7441` |
| `diners`       | Diners               | `382:7443` |
| `discover`     | Discover             | `382:7445` |
| `jcb`          | JCB                  | `382:7447` |
| `unionpay`     | UnionPay             | `382:7449` |
| `bancomat-pay` | BANCOMAT Pay         | `382:7451` |
| `pagobancomat` | PagoBANCOMAT         | `382:7458` |
| `apple-pay`    | Apple Pay            | `382:7460` |
| `paypal`       | PayPal               | `382:7462` |
| `satispay`     | Satispay             | `382:7467` |
| `mybank`       | MyBank               | `382:7469` |
| `app-postepay` | App Postepay         | `382:7478` |
| `vpay`         | vPay                 | `382:7483` |

The SVG files in `src/assets/psp-logos` are exports pinned to Figma version
`2409404974909792292`, rendered at the shared icon size with no card, frame or
extra radius around the source artwork.

The existing `providers` mode remains a separate caller-owned list extension:
it supports arbitrary image URLs and text-only names, and retains its existing
cards. Its card geometry is not part of the Figma logo variants. The `Fidelity`
story renders every source variant individually so the pinned artwork can be
inspected without treating that extension as source evidence.

Logos are non-interactive images with meaningful alternative text. A caller
that makes a payment option actionable should wrap the logo in the appropriate
native link or button and provide the action's own accessible name.
