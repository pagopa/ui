import assert from "node:assert/strict"
import { test } from "node:test"

import { checkDataSlots } from "../../src/checks/data-slots.ts"
import { fixtureTree, workspaceAt } from "../helpers/cli.mjs"

// The root slot contract on one component, defect by defect. A fixture starts
// from a compliant root and each case below removes one guarantee, so a problem
// names the rule it came from and nothing else moves.
const SURFACE = `export * from "./components/dialog"
`

function dialog({ slot = `data-slot="dialog" `, child = "", body = "" } = {}) {
  return `"use client"

import * as React from "react"

export function Dialog({ ...props }: React.ComponentProps<"div">) {
  ${body}
  return (
    <div ${slot}{...props}>
      ${child}
    </div>
  )
}
`
}

const tree = (source, extra = {}) => ({
  "src/pagopa-ui.ts": SURFACE,
  "src/components/dialog.tsx": source,
  ...extra,
})

function check(files) {
  const fixture = fixtureTree(files, "data-slots-")
  try {
    return checkDataSlots(workspaceAt(fixture.root))
  } finally {
    fixture.dispose()
  }
}

const hasProblem = (result, pattern) => assert.match(result.problems.join("\n"), pattern)

test("a public root that carries its own slot passes", () => {
  const result = check(tree(dialog()))
  assert.deepEqual(result.problems, [])
  assert.equal(result.summary, "1 public component(s), 0 exempt")
})

test("a root that carries no slot fails", () => {
  hasProblem(
    check(tree(dialog({ slot: "" }))),
    /dialog\.tsx: Dialog: the root carries no data-slot/,
  )
})

// A part never stands in for its root: it spells its own name, and the name is
// judged, even when the root itself carries nothing.
test("a part inside the root cannot satisfy the root", () => {
  hasProblem(
    check(tree(dialog({ slot: "", child: `<span data-slot="dialog-title" />` }))),
    /dialog\.tsx: Dialog: the root slot is "dialog-title", not "dialog"/,
  )
})

test("a root whose slot is a part name fails on the name, not on presence", () => {
  hasProblem(
    check(tree(dialog({ slot: `data-slot="dialog-title" ` }))),
    /dialog\.tsx: Dialog: the root slot is "dialog-title", not "dialog"/,
  )
})

// A wrapper that renders no host element of its own - a Base UI root, a
// portal, a provider - pushes the anatomy down to the first stamped element.
test("a portal root passes on the element it portals in", () => {
  const source = `"use client"

import * as React from "react"
import { Popover } from "@base-ui/react/popover"

export function Dialog({ ...props }: React.ComponentProps<"div">) {
  return (
    <Popover.Root>
      <Popover.Portal>
        <Popover.Popup data-slot="dialog" {...props} />
      </Popover.Portal>
    </Popover.Root>
  )
}
`
  assert.deepEqual(check(tree(source)).problems, [])
})

test("a root held in a body constant passes", () => {
  const source = `"use client"

import * as React from "react"

export function Dialog({ ...props }: React.ComponentProps<"div">) {
  const line = <div data-slot="dialog" {...props} />
  return line
}
`
  assert.deepEqual(check(tree(source)).problems, [])
})

// `@base-ui/react`'s `useRender` does not turn `state.slot` into an attribute,
// so the composite has to stamp the props object it hands over.
test("a slot stamped in a useRender props object passes", () => {
  const source = `"use client"

import * as React from "react"
import { useRender } from "@base-ui/react/use-render"
import { mergeProps } from "@base-ui/react/merge-props"

export function Dialog({ ...props }: React.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">({ "data-slot": "dialog" }, props),
    state: { slot: "dialog" },
  })
}
`
  assert.deepEqual(check(tree(source)).problems, [])
})

test("a stamp held in an `as const` constant and spread in passes", () => {
  const source = `"use client"

import * as React from "react"
import { useRender } from "@base-ui/react/use-render"
import { mergeProps } from "@base-ui/react/merge-props"

const ROOT_SLOT = { "data-slot": "dialog" } as const

export function Dialog({ ...props }: React.ComponentProps<"div">) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">({ ...ROOT_SLOT, className: "root" }, props),
  })
}
`
  assert.deepEqual(check(tree(source)).problems, [])
})

test("a slot behind a conditional props const passes", () => {
  const source = `"use client"

import * as React from "react"
import { useRender } from "@base-ui/react/use-render"

export function Dialog({ variant }: { variant?: "label" }) {
  const renderProps =
    variant === "label" ? { "data-slot": "dialog", className: "label" } : { className: "plain" }
  return useRender({ defaultTagName: "div", props: renderProps })
}
`
  assert.deepEqual(check(tree(source)).problems, [])
})

const EXCEPTIONS = "src/data-slot-exceptions.json"

test("an exception waives its component and is reported as a warning", () => {
  const result = check(
    tree(dialog({ slot: `data-slot="dialog-title" ` }), {
      [EXCEPTIONS]: {
        schemaVersion: 1,
        exceptions: [{ component: "Dialog", rule: "slot-name", reason: "kept on purpose" }],
      },
    }),
  )
  assert.deepEqual(result.problems, [])
  assert.deepEqual(result.warnings, ["Dialog: slot-name: kept on purpose"])
  assert.equal(result.summary, "1 public component(s), 1 exempt")
})

test("an exception that no longer matches a defect is an error", () => {
  const result = check(
    tree(dialog(), {
      [EXCEPTIONS]: {
        schemaVersion: 1,
        exceptions: [{ component: "Dialog", rule: "slot-name", reason: "no longer needed" }],
      },
    }),
  )
  assert.deepEqual(result.problems, [
    "src/data-slot-exceptions.json: stale exception Dialog|slot-name, the contract holds",
  ])
})

test("an exception naming an unknown rule does not parse", () => {
  assert.throws(
    () =>
      check(
        tree(dialog(), {
          [EXCEPTIONS]: {
            schemaVersion: 1,
            exceptions: [{ component: "Dialog", rule: "whatever", reason: "typo" }],
          },
        }),
      ),
    /src\/data-slot-exceptions\.json: Invalid option: expected one of "root-slot"\|"slot-name"/,
  )
})
