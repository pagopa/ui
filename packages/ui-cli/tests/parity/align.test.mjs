import assert from "node:assert/strict"
import { test } from "node:test"

import { align, classHint, formatAlign, nextSteps } from "../../src/parity/align.ts"

// The token vocabulary the hints read: the same shape `diff.tokenIndex` builds,
// pinned to the few steps the fixtures use so the formatter is deterministic.
const index = {
  type: [{ name: "text-body-small", size: 14, lineHeight: 20 }],
  radius: [
    { name: "radius-4", value: 4 },
    { name: "radius-8", value: 8 },
  ],
  color: [],
  space: Array.from({ length: 20 }, (_, step) => ({
    name: `space-${step + 1}`,
    value: (step + 1) * 4,
  })),
}

const node = {
  nodeId: "1:2",
  name: "Fixture",
  status: "implemented",
  export: "Fixture",
  story: "apps/storybook/src/Fixture.stories.tsx",
  declared: ["desktop"],
  covered: ["desktop"],
  missing: [],
  cases: [
    {
      id: "1-2-default-desktop",
      device: "desktop",
      verdict: "review-required",
      deltas: [
        {
          path: "field.padding.top",
          source: 8,
          render: 0,
          severity: "delta",
          token: { kind: "near-token", name: "text-mono--letter-spacing" },
        },
        {
          path: "field.radius",
          source: 8,
          render: 4,
          severity: "delta",
          token: { kind: "token", name: "radius-4" },
        },
        {
          path: "field.font.size",
          source: 21,
          render: 23,
          severity: "delta",
          token: { kind: "inline" },
        },
      ],
    },
  ],
}

// The formatter reads the delta's token for the label and the source value for
// the hint: the token describes the render, the hint the target.
test("the formatter prints one line per delta with its class hint", () => {
  const lines = formatAlign(node, index).split("\n")
  assert.equal(
    lines[0],
    "1:2 Fixture · implemented · export Fixture · apps/storybook/src/Fixture.stories.tsx",
  )
  assert.equal(lines[1], "  devices: declared desktop · covered desktop · missing none")
  assert.equal(lines[2], "  1-2-default-desktop [desktop] review-required")
  assert.deepEqual(lines.slice(3, 6), [
    "    field padding.top: render 0 · source 8 · token: space-2 → use pt-2",
    "    field radius: render 4 · source 8 · token: radius-8 → use rounded-lg",
    "    field font.size: render 23 · source 21 · inline",
  ])
  assert.equal(lines[6], "Next")
})

// One case per property family: the utility prefix comes from the property, the
// step or name from the token.
test("the mapping table names a utility for every property family", () => {
  const token = (name) => ({ kind: "token", name })
  assert.equal(classHint("padding", token("space-3"), index), "p-3")
  assert.equal(classHint("padding.top", token("space-2"), index), "pt-2")
  assert.equal(classHint("padding.right", token("space-4"), index), "pr-4")
  assert.equal(classHint("padding.bottom", token("space-5"), index), "pb-5")
  assert.equal(classHint("padding.left", token("space-6"), index), "pl-6")
  assert.equal(classHint("gap", token("space-1"), index), "gap-1")
  assert.equal(classHint("radius", token("radius-8"), index), "rounded-lg")
  assert.equal(classHint("font.size", token("text-body-small"), index), "text-body-small")
  assert.equal(
    classHint("font.color", token("Color/Blue/Blue 600"), index),
    "text-color-blue-blue-600",
  )
  assert.equal(
    classHint("background", token("Surface/Surface blue"), index),
    "bg-surface-surface-blue",
  )
  assert.equal(
    classHint("border.color", token("Border/Border fill"), index),
    "border-border-border-fill",
  )
  // A property outside the table keeps the token name: no class, no invention.
  assert.equal(classHint("border.width", token("space-2"), index), undefined)
})

// The formatter never invents a hint for an inline value, and a token whose
// family does not match the property stays a name.
test("a token outside the property family prints its name only", () => {
  const lines = formatAlign(
    {
      ...node,
      cases: [
        {
          ...node.cases[0],
          deltas: [
            {
              path: "field.padding.top",
              source: 1,
              render: 0,
              severity: "delta",
              token: { kind: "near-token", name: "text-body-small" },
            },
          ],
        },
      ],
    },
    index,
  ).split("\n")
  assert.equal(lines[3], "    field padding.top: render 0 · source 1 · near-token: text-body-small")
})

// A node with no committed case still answers: the header, the missing devices
// and the sync command, exit 0 — no browser, no evaluator.
test("a node without cases prints its missing devices and exits 0", async () => {
  const logged = []
  const original = console.log
  console.log = (line) => logged.push(String(line))
  try {
    const code = await align(
      { flags: new Map([["node", "9:9"]]) },
      {
        loadNode: () => ({
          nodeId: "9:9",
          name: "Fixture",
          status: "implemented",
          export: "Fixture",
          story: null,
          declared: ["desktop", "mobile"],
          covered: [],
          missing: ["desktop", "mobile"],
          cases: [],
        }),
        loadCases: () => [],
        evaluate: () => {
          throw new Error("a node without cases has nothing to capture")
        },
        storybook: () => {
          throw new Error("a node without cases never probes Storybook")
        },
      },
    )
    assert.equal(code, 0)
  } finally {
    console.log = original
  }
  const text = logged.join("\n")
  assert.match(text, /^9:9 Fixture · implemented · export Fixture · \(no story\)$/m)
  assert.match(text, /devices: declared desktop,mobile · covered none · missing desktop,mobile/)
  assert.match(text, /figma:parity:cases -- --sync --node 9:9/)
})

test("nextSteps stops at three lines and says nothing is left when clean", () => {
  assert.deepEqual(nextSteps({ ...node, cases: [] }), [
    "pnpm nx run pagopa-ui-cli:figma:parity:cases -- --sync --node 1:2",
  ])
  assert.deepEqual(
    nextSteps({
      ...node,
      missing: ["mobile"],
      cases: [{ ...node.cases[0], verdict: "verified", deltas: [] }],
    }).length,
    1,
  )
  assert.deepEqual(nextSteps({ ...node, cases: [{ ...node.cases[0], deltas: [] }] }), [
    "aligned, no action",
  ])
})
