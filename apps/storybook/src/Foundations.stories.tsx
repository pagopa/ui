import type { Meta, StoryObj } from "@storybook/react-vite"

import { figmaTokens, figmaTokenSource, type FigmaToken } from "pagopa-ui-tokens"

import foundationsGuide from "./guides/foundations.md?raw"

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
    <main className="w-[min(64rem,calc(100vw-2rem))] space-y-12 p-6">
      <header className="max-w-3xl">
        <p className="font-semibold text-primary">PagoPA UI</p>
        <h1 className="mt-2 text-hero">Fondamenti</h1>
        <p className="mt-3 text-body text-muted-foreground">
          Token generati dalle Variables Figma del file {figmaTokenSource.fileKey} (sincronizzati il{" "}
          {figmaTokenSource.syncedAt} via {figmaTokenSource.method}). Gli alias semantici vivono in
          src/index.css; i valori locali rimasti sono estensioni documentate. La provenienza è in{" "}
          <code>packages/tokens/src/manifest.json</code>.
        </p>
      </header>

      <section aria-labelledby="colors-title" className="space-y-6">
        <h2 id="colors-title" className="text-h3">
          Colori
        </h2>
        {groupColors(colors).map(([group, tokens]) => (
          <div key={group} className="space-y-3">
            <h3 className="text-label-sb">{group}</h3>
            <div className="grid gap-3 tablet:grid-cols-2 desktop:grid-cols-3">
              {tokens.map((token) => (
                <div key={token.name} className="overflow-hidden rounded-lg border bg-card">
                  <div
                    className="h-16"
                    style={{ backgroundColor: token.value }}
                    aria-hidden="true"
                  />
                  <div className="space-y-1 p-3">
                    <p className="text-label-sb">{tokenLabel(token)}</p>
                    <p className="font-mono text-xs break-all text-muted-foreground">
                      {token.cssName}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">{token.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section aria-labelledby="type-title" className="space-y-5">
        <h2 id="type-title" className="text-h3">
          Tipografia
        </h2>
        <div className="space-y-5 rounded-lg border p-6">
          {typography.map((token) => (
            <div key={token.name} className="space-y-1">
              <p
                className={token.cssName === "text-mono" ? "font-mono" : undefined}
                style={{
                  fontSize: token.fontSize,
                  lineHeight: token.lineHeight,
                  fontWeight: token.fontWeight,
                  letterSpacing: token.letterSpacing,
                }}
              >
                {tokenLabel(token)} · PagoPA, servizi pubblici digitali
              </p>
              <p className="text-caption text-muted-foreground">
                <span className="font-mono">{token.cssName}</span> · {token.value}
                {token.detail ? ` · ${token.detail}` : null}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="radius-title" className="space-y-5">
        <h2 id="radius-title" className="text-h3">
          Raggi
        </h2>
        <div className="flex flex-wrap gap-5">
          {radii.map((token) => (
            <div key={token.name} className="space-y-2">
              <div
                className="size-24 border-2 border-primary bg-accent"
                style={{ borderRadius: token.value }}
                aria-hidden="true"
              />
              <p className="text-caption text-muted-foreground">
                <span className="font-mono">{token.cssName}</span> · {token.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="elevation-title" className="space-y-5">
        <h2 id="elevation-title" className="text-h3">
          Elevazione
        </h2>
        <div className="flex flex-wrap gap-8 py-4">
          {effects.map((token) => (
            <div key={token.name} className="space-y-2">
              <div
                className="size-32 rounded-16 bg-card"
                style={{ boxShadow: token.value }}
                aria-hidden="true"
              />
              <p className="text-caption text-muted-foreground">
                <span className="font-mono">{token.cssName}</span> · {token.value}
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
  tags: ["no-visual"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `Colours, typography, radii and elevation generated from the Figma Variables; the inventory is regenerated by scripts/figma-tokens.mjs and verified by pnpm tokens:check.\n\n${foundationsGuide}`,
      },
    },
  },
} satisfies Meta<typeof Foundations>

export default meta
type Story = StoryObj<typeof meta>

export const Overview: Story = { parameters: { a11yContract: { reflow: false } } }
