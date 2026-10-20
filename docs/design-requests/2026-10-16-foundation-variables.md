# Design request — foundation variables to publish

Date: 16 October 2026. Origin: flow C (`docs/plans/c-foundation-and-lint.md`).
Figma was not modified: the values below are derived read-only from the
"Regole spaziatura" page (`123:4852`) and from the recurring values in the
component snapshot (`.figma/live-rest.json`). The manifest
`src/tokens/manifest.json` and `src/tokens/foundations.json` already record them
as **local extensions**, with the source; this request is their design
counterpart.

## Why

Today the components use these values with or without a token. Flow C recorded
them as local extensions and made them verifiable (`pnpm foundation:check`);
publishing them as Figma variables would make them part of the official
foundation.

## Recurring spacings (outside the published 4/8/16/24/32/40/48 scale)

|  Value | Occurrences in the snapshot | Typical use                               |
| -----: | --------------------------: | ----------------------------------------- |
|   1 px |                         202 | borders and hairlines                     |
|   2 px |                        1425 | internal gaps, itemSpacing                |
|   3 px |                        3072 | border and indicator insets               |
|   6 px |                         860 | gap between icon and text                 |
|  10 px |                        2511 | compact padding                           |
|  12 px |                        7575 | the most recurring value: padding and gap |
|  14 px |                         480 | row padding                               |
|  20 px |                         407 | card padding                              |
|  56 px |                          16 | section padding                           |
|  64 px |                          77 | large section gaps                        |
|  80 px |                          36 | page spacings                             |
| 132 px |                          12 | footer side padding                       |

Question: should they be published as a spacing scale (or confirmed as
deliberate extensions)? The values 12/2/6/10 are the ones used most in the code.

## Radii

| Value | Occurrences | Note                         |
| ----: | ----------: | ---------------------------- |
|  2 px |          19 | indicators, tooltip tips     |
|  4 px |         116 | skeletons and small elements |

The published scale is 0/8/16/24. The snapshot also shows 5.82 px, 12, 20, 28 and
64; 8 px and the full radius are the most frequent. Question: which ones should
be published?

## Dimensions (controls and icons)

Recurring in the snapshot: icons 16/20/24/32 (24 the most frequent), control
heights 40/44/48/56 (48 the most frequent). Today they are recorded in the
manifest as dimensions; the code mostly uses the spacing scale. Question: is
there an official dimension scale to publish?

## Breakpoints and containers

The Device values are recorded as tokens with their own names (`tablet` 600,
`tablet-md` 900, `desktop` 1200, `desktop-xl` 1536, `desktop-xxl` 1920), next to
the Tailwind defaults the code keeps using (`sm` 640, `md` 768, `lg` 1024):
aligning the two sets changes the rendering between 600 and 1024 px and needs a
component-by-component, per-device review. The value 1920 appears only in the XXL
variant of the White Template and has no published variable. Question: do you
confirm the device scale and the way the code should map it?

The Table, TableListItem and Pagination components change their layout below
640 px of their container; Timeline below 432 px. Neither value appears in the
snapshot geometry: they are hand-off choices. Question: confirm them or indicate
the correct values?

## z-index

The code uses 0/10/20/30/50 for the layers (content, sticky, overlay, floating
panels). The file has no z-index scale. Question: is an official scale needed
(better with semantic names) or does it stay an implementation matter?

## Values recorded as exceptions (to be clarified)

|         Value | Where                                      | Why it is an exception                                                  |
| ------------: | ------------------------------------------ | ----------------------------------------------------------------------- |
|         28 px | dropdown menu, timeline, microevents       | not present in the snapshot geometry                                    |
|         36 px | trailing spacing of menu items             | not present                                                             |
|         44 px | text field with a leading icon             | composition 12 + 24 + 8, not a single spacing                           |
|         88 px | calendar, space for the navigation buttons | not present                                                             |
| 18 px regular | description of the login screen            | the library only has "Body Big Semibold": the regular weight is missing |

Moreover `Color/Icon/Disabled icon` does not appear in the search for published
assets: it is still used in the components but without a public key. Question:
should it be published or replaced?

## What we are asking for, in short

1. Confirm or correct the recurring values above so that they become published
   variables (spacings, radii, dimensions).
2. Confirm the breakpoints 600/900/1200/1536 and the value 1920.
3. Confirm the two container values (640 and 432 px).
4. Decide the future of the exceptions listed: fix in Figma or publish the
   value.
