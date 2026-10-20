# Titillio (bundled source font)

The bundled text family of the library. The three WOFF2 faces are unmodified
copies of the released files, redistributed under the SIL Open Font License 1.1
(`LICENSE.txt`, reserved font name "Titillio").

- **Source:** <https://github.com/pagopa/titillio>
- **Pinned commit:** `d648338512b6e224ed8bdca50b75f72ba1e8711f` (2025-05-19)
- **Vendored:** 2026-10-14

| File                      | SHA-256                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| `Titillio-Regular.woff2`  | `0b32285a206f43ed14eb322a33452cae3400cbac10915ed5836c6148d6b6a6e6` |
| `Titillio-Semibold.woff2` | `8ce5332d8c24d5a0155d441ba0d47faf4b9f1d7e623d3f379da9419e2545bc76` |
| `Titillio-Bold.woff2`     | `62796ec2ba6bb9fa89d955cfc9d49d5acd52977ee3329665c6f35a6b2fa0fa5f` |

`src/index.css` declares the faces at the canonical CSS weights (Semibold 600,
Bold 700); the files' OS/2 `usWeightClass` values are 400, 500 and 600, and the
source Figma styles name the same faces "Semibold" (reported weight 500) and
"Bold" (reported weight 600). Keep `BUNDLED_WEIGHTS` in
`scripts/figma-tokens.mjs` in sync with the declarations.

The upstream repository ships no tags, releases or npm package, so updates
re-pin commit by commit: replace the files, refresh the digests above and re-run
`pnpm tokens:check`, `pnpm build` and `pnpm library:check`.
