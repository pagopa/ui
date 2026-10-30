<!-- component-rules:start -->

## Component Rules

- Place the logos 24px from the bottom and right edge of the viewport.

<!-- component-rules:end -->

`PaymentProviderLogos` renders one pinned, source-colour logo per `brand`; the
default alternative text is the brand name, and `alt` replaces it only when a more
useful label is needed in context.

The `providers` mode remains a separate caller-owned list extension: it supports
arbitrary image URLs and text-only names and keeps its own cards, which are not
part of the Figma logo variants.

Logos are non-interactive images with meaningful alternative text. A caller that
makes a payment option actionable wraps the logo in the appropriate native link or
button and provides the action's own accessible name.
