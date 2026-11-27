import type { Meta, StoryObj } from "@storybook/react-vite"

import { figmaTokens, figmaTokenSource, type FigmaToken } from "pagopa-ui-tokens"

import foundationsGuide from "./guides/foundations.md?raw"
import tokensGuide from "./guides/tokens.md?raw"

function groupColors(tokens: FigmaToken[]) {
  const groups = new Map<string, FigmaToken[]>()
  for (const token of tokens) {
    const group = token.name.split("/")[1] ?? "Altro"
    groups.set(group, [...(groups.get(group) ?? []), token])
  }
  return [...groups.entries()]
}

function tokenLabel(token: FigmaToken) {
  return token.name.split("/").pop() ?? token.name
}

function Foundations() {
  const colors = figmaTokens.filter((token) => token.type === "COLOR")
  const typography = figmaTokens.filter((token) => token.type === "TYPOGRAPHY")
  const radii = figmaTokens.filter(
    (token) => token.type === "FLOAT" && token.name.startsWith("Foundations/radius-"),
  )
  const effects = figmaTokens.filter((token) => token.type === "EFFECT")

  return (
    <main className="pui:w-[min(64rem,calc(100vw-2rem))] pui:space-y-12 pui:p-6">
      <header className="pui:max-w-3xl">
        <p className="pui:font-semibold pui:text-primary">PagoPA UI</p>
        <h1 className="pui:mt-2 pui:text-hero">Fondamenti</h1>
        <p className="pui:mt-3 pui:text-body pui:text-muted-foreground">
          Token generati dalle Variables Figma del file {figmaTokenSource.fileKey} (sincronizzati il{" "}
          {figmaTokenSource.syncedAt} via {figmaTokenSource.method}). Gli alias semantici vivono in
          src/index.css; i valori locali rimasti sono estensioni documentate. La provenienza è in{" "}
          <code>packages/tokens/src/manifest.json</code>.
        </p>
      </header>

      <section aria-labelledby="colors-title" className="pui:space-y-6">
        <h2 id="colors-title" className="pui:text-h3">
          Colori
        </h2>
        {groupColors(colors).map(([group, tokens]) => (
          <div key={group} className="pui:space-y-3">
            <h3 className="pui:text-label-sb">{group}</h3>
            <div className="pui:grid pui:gap-3 pui:tablet:grid-cols-2 pui:desktop:grid-cols-3">
              {tokens.map((token) => (
                <div
                  key={token.name}
                  className="pui:overflow-hidden pui:rounded-lg pui:border pui:bg-card"
                >
                  <div
                    className="pui:h-16"
                    style={{ backgroundColor: token.value }}
                    aria-hidden="true"
                  />
                  <div className="pui:space-y-1 pui:p-3">
                    <p className="pui:text-label-sb">{tokenLabel(token)}</p>
                    <p className="pui:font-mono pui:text-xs pui:break-all pui:text-muted-foreground">
                      {token.cssName}
                    </p>
                    <p className="pui:font-mono pui:text-xs pui:text-muted-foreground">
                      {token.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section aria-labelledby="type-title" className="pui:space-y-5">
        <h2 id="type-title" className="pui:text-h3">
          Tipografia
        </h2>
        <div className="pui:space-y-5 pui:rounded-lg pui:border pui:p-6">
          {typography.map((token) => (
            <div key={token.name} className="pui:space-y-1">
              <p
                className={token.cssName === "text-mono" ? "pui:font-mono" : undefined}
                style={{
                  fontSize: token.fontSize,
                  lineHeight: token.lineHeight,
                  fontWeight: token.fontWeight,
                  letterSpacing: token.letterSpacing,
                }}
              >
                {tokenLabel(token)} · PagoPA, servizi pubblici digitali
              </p>
              <p className="pui:text-caption pui:text-muted-foreground">
                <span className="pui:font-mono">{token.cssName}</span> · {token.value}
                {token.detail ? ` · ${token.detail}` : null}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="radius-title" className="pui:space-y-5">
        <h2 id="radius-title" className="pui:text-h3">
          Raggi
        </h2>
        <div className="pui:flex pui:flex-wrap pui:gap-5">
          {radii.map((token) => (
            <div key={token.name} className="pui:space-y-2">
              <div
                className="pui:size-24 pui:border-2 pui:border-primary pui:bg-accent"
                style={{ borderRadius: token.value }}
                aria-hidden="true"
              />
              <p className="pui:text-caption pui:text-muted-foreground">
                <span className="pui:font-mono">{token.cssName}</span> · {token.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="elevation-title" className="pui:space-y-5">
        <h2 id="elevation-title" className="pui:text-h3">
          Elevazione
        </h2>
        <div className="pui:flex pui:flex-wrap pui:gap-8 pui:py-4">
          {effects.map((token) => (
            <div key={token.name} className="pui:space-y-2">
              <div
                className="pui:size-32 pui:rounded-16 pui:bg-card"
                style={{ boxShadow: token.value }}
                aria-hidden="true"
              />
              <p className="pui:text-caption pui:text-muted-foreground">
                <span className="pui:font-mono">{token.cssName}</span> · {token.value}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

const meta = {
  title: "Foundations/Tokens",
  component: Foundations,
  // A catalogue of every token: it changes whenever the palette does.
  parameters: {
    chromatic: { disableSnapshot: true },
    layout: "fullscreen",
    docs: {
      description: {
        component: `Colours, typography, radii and elevation generated from the Figma Variables; the inventory is regenerated by scripts/figma-tokens.mjs and verified by pnpm nx run pagopa-ui-tokens:check:tokens.\n\n${foundationsGuide}\n\n${tokensGuide}`,
      },
    },
  },
} satisfies Meta<typeof Foundations>

export default meta
type Story = StoryObj<typeof meta>

export const Overview: Story = { parameters: { a11yContract: { reflow: false } } }
