import assert from "node:assert/strict"
import { test } from "node:test"

import { checkConsumerDx } from "../../src/checks/consumer-dx.ts"
import { fixtureTree, runCli, workspaceAt } from "../helpers/cli.mjs"

// The consumer DX contract on one component, defect by defect: every option
// below removes exactly one guarantee, so a problem names the option it came
// from and nothing else moves.
function dialog({
  parity = true,
  attributes = true,
  forwardedRef = true,
  className = true,
  applied = true,
  exported = true,
} = {}) {
  // `className` is always subtracted and re-declared, the way the components
  // spell it; `ref` joins the subtraction only when the component drops it.
  const subtracted = forwardedRef ? `"className"` : `"className" | "ref"`
  const heritage = attributes ? ` extends Omit<React.ComponentProps<"div">, ${subtracted}>` : ""
  const members = [
    `  open?: boolean`,
    parity ? `  defaultOpen?: boolean` : null,
    `  onOpenChange?: (open: boolean) => void`,
    className ? `  className?: string` : null,
    forwardedRef ? `  ref?: React.Ref<HTMLDivElement>` : null,
  ]
    .filter((member) => member !== null)
    .join("\n")
  // A component consumes only what its props declare; `applied: false` keeps the
  // declarations and drops every use, which is the other defect.
  const consumed = [className ? "className" : null, forwardedRef ? "ref" : null].filter(
    (name) => name !== null,
  )
  const signature = `{ ${["open", "defaultOpen", "onOpenChange", ...(applied ? consumed : [])].join(
    ", ",
  )}, ...props }: DialogProps`
  const element = applied
    ? `<div ${consumed.map((name) => `${name}={${name}}`).join(" ")} {...props} />`
    : `<div />`
  const exports = exported ? `export { Dialog, type DialogProps }` : `export { Dialog }`
  return `"use client"

import * as React from "react"

interface DialogProps${heritage} {
${members}
}

function Dialog(${signature}) {
  React.useEffect(() => onOpenChange?.(open ?? defaultOpen ?? false), [open, defaultOpen, onOpenChange])
  return ${element}
}

${exports}
`
}

const SURFACE = `export * from "./components/dialog"
`

const STATELESS = `"use client"

import * as React from "react"

export function Line({ label }: { label: string }) {
  return <span>{label}</span>
}
`

const tree = (source, extra = {}) => ({
  "src/pagopa-ui.ts": SURFACE,
  "src/components/dialog.tsx": source,
  ...extra,
})

function check(files) {
  const fixture = fixtureTree(files, "consumer-dx-")
  try {
    return checkConsumerDx(workspaceAt(fixture.root))
  } finally {
    fixture.dispose()
  }
}

const hasProblem = (result, pattern) => assert.match(result.problems.join("\n"), pattern)

test("a public stateful component with the whole contract passes", () => {
  const result = check(tree(dialog()))
  assert.deepEqual(result.problems, [])
  assert.equal(result.summary, "1 stateful component(s), 0 exempt")
})

test("a controlled prop without its uncontrolled pair fails", () => {
  hasProblem(
    check(tree(dialog({ parity: false }))),
    /dialog\.tsx: Dialog: open pairs with onOpenChange but no defaultOpen/,
  )
})

test("a props type that inherits no host type fails", () => {
  hasProblem(
    check(tree(dialog({ attributes: false }))),
    /dialog\.tsx: Dialog: DialogProps extends no host type, so standard attributes do not reach the element/,
  )
})

test("a props type without ref fails", () => {
  hasProblem(
    check(tree(dialog({ forwardedRef: false }))),
    /dialog\.tsx: Dialog: DialogProps has no ref/,
  )
})

test("a props type without className fails", () => {
  hasProblem(
    check(tree(dialog({ className: false }))),
    /dialog\.tsx: Dialog: DialogProps has no className/,
  )
})

test("a declared className or ref that reaches no element fails", () => {
  const result = check(tree(dialog({ applied: false })))
  hasProblem(result, /dialog\.tsx: Dialog: className is declared but never applied/)
  hasProblem(result, /dialog\.tsx: Dialog: ref is declared but never forwarded/)
})

test("a props type its own module exports but the entry barrel drops fails", () => {
  hasProblem(
    check({
      "src/pagopa-ui.ts": `export { Dialog } from "./components/dialog"\n`,
      "src/components/dialog.tsx": dialog(),
    }),
    /dialog\.tsx: Dialog: DialogProps is not exported from src\/pagopa-ui\.ts/,
  )
})

test("a props type the module does not export fails", () => {
  hasProblem(
    check(tree(dialog({ exported: false }))),
    /dialog\.tsx: Dialog: DialogProps is not exported from src\/pagopa-ui\.ts/,
  )
})

test("an arrow component is read like a declaration", () => {
  const source = `"use client"

import * as React from "react"

interface DialogProps extends Omit<React.ComponentProps<"div">, "className"> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  ref?: React.Ref<HTMLDivElement>
}

const Dialog = ({ className, onOpenChange, open, ref, ...props }: DialogProps) => {
  React.useEffect(() => onOpenChange?.(open ?? false), [open, onOpenChange])
  return <div className={className} ref={ref} {...props} />
}

export { Dialog, type DialogProps }
`
  const result = check(tree(source))
  hasProblem(result, /dialog\.tsx: Dialog: open pairs with onOpenChange but no defaultOpen/)
  assert.equal(result.summary, "1 stateful component(s), 0 exempt")
})

test("an array or object spread does not stand in for a JSX prop spread", () => {
  const source = `"use client"

import * as React from "react"

interface ListProps extends Omit<React.ComponentProps<"ul">, "className"> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  ref?: React.Ref<HTMLUListElement>
  items: string[]
}

function List({ className, items, onOpenChange, open, ref }: ListProps) {
  const rows = [...items]
  React.useEffect(() => onOpenChange?.(open ?? false), [open, onOpenChange])
  return <ul>{rows.map((row) => <li key={row}>{row}</li>)}</ul>
}

export { List, type ListProps }
`
  const result = check({
    "src/pagopa-ui.ts": `export * from "./components/list"\n`,
    "src/components/list.tsx": source,
  })
  hasProblem(result, /list\.tsx: List: className is declared but never applied/)
  hasProblem(result, /list\.tsx: List: ref is declared but never forwarded/)
})

test("destructuring the props inside the body does not stand in for applying them", () => {
  const source = `"use client"

import * as React from "react"

interface BadgeProps extends Omit<React.ComponentProps<"span">, "className"> {
  className?: string
  ref?: React.Ref<HTMLSpanElement>
  label: string
}

function Badge(props: BadgeProps) {
  const { className, label, ref, ...rest } = props
  return <span {...rest}>{label}</span>
}

export { Badge, type BadgeProps }
`
  const result = check({
    "src/pagopa-ui.ts": `export * from "./components/badge"\n`,
    "src/components/badge.tsx": source,
  })
  hasProblem(result, /badge\.tsx: Badge: className is declared but never applied/)
  hasProblem(result, /badge\.tsx: Badge: ref is declared but never forwarded/)
})

test("the same component that applies them is accepted", () => {
  const source = `"use client"

import * as React from "react"

interface BadgeProps extends Omit<React.ComponentProps<"span">, "className"> {
  className?: string
  ref?: React.Ref<HTMLSpanElement>
  label: string
}

function Badge(props: BadgeProps) {
  const { className, label, ref, ...rest } = props
  return <span className={className} ref={ref} {...rest}>{label}</span>
}

export { Badge, type BadgeProps }
`
  const result = check({
    "src/pagopa-ui.ts": `export * from "./components/badge"\n`,
    "src/components/badge.tsx": source,
  })
  assert.deepEqual(result.problems, [])
})

test("a component outside the public surface is not checked", () => {
  const result = check({
    "src/pagopa-ui.ts": `export { Line } from "./components/line"\n`,
    "src/components/line.tsx": STATELESS,
    "src/components/dialog.tsx": dialog({ parity: false, forwardedRef: false }),
  })
  assert.deepEqual(result.problems, [])
  assert.equal(result.summary, "0 stateful component(s), 0 exempt")
})

test("a component typed inline is judged on the state it destructures alone", () => {
  // There is no props type to read the host surface from, so only the state a
  // consumer would drive is in reach.
  const result = check({
    "src/pagopa-ui.ts": `export * from "./components/line"\n`,
    "src/components/line.tsx": STATELESS,
  })
  assert.deepEqual(result.problems, [])
})

test("a registered exception warns and a stale one fails", () => {
  const exceptions = (entries) => ({
    "src/consumer-dx-exceptions.json": { schemaVersion: 1, exceptions: entries },
  })
  const registered = check(
    tree(
      dialog({ parity: false }),
      exceptions([{ component: "Dialog", rule: "parity", reason: "the next wave pairs it" }]),
    ),
  )
  assert.deepEqual(registered.problems, [])
  assert.deepEqual(registered.warnings, ["Dialog: parity: the next wave pairs it"])
  assert.equal(registered.summary, "1 stateful component(s), 1 exempt")

  hasProblem(
    check(
      tree(
        dialog(),
        exceptions([{ component: "Dialog", rule: "parity", reason: "the next wave pairs it" }]),
      ),
    ),
    /src\/consumer-dx-exceptions\.json: stale exception Dialog\|parity, the contract holds/,
  )
  hasProblem(
    check(
      tree(
        dialog({ parity: false }),
        exceptions([{ component: "Dialog", rule: "sparkles", reason: "invented" }]),
      ),
    ),
    /src\/consumer-dx-exceptions\.json: exception Dialog\|sparkles names no rule \(parity, className, ref, attributes, props type\)/,
  )
})

test("the check is a gate the command layer fails", async () => {
  const conforming = fixtureTree(tree(dialog()), "consumer-dx-")
  const violating = fixtureTree(tree(dialog({ parity: false })), "consumer-dx-")
  try {
    const ok = await runCli(["check", "consumer-dx"], { root: conforming.root })
    assert.equal(ok.status, 0)
    assert.match(ok.stdout, /^consumer DX: OK — 1 stateful component\(s\), 0 exempt$/m)

    const failed = await runCli(["check", "consumer-dx"], { root: violating.root })
    assert.equal(failed.status, 1)
    assert.match(
      failed.stderr,
      /^consumer DX: 1 problem\(s\) — 1 stateful component\(s\), 0 exempt$/m,
    )
    assert.match(failed.stderr, /Dialog: open pairs with onOpenChange but no defaultOpen/)
  } finally {
    conforming.dispose()
    violating.dispose()
  }
})

// A component without controlled state owes a consumer exactly what a stateful
// one does: the surface is every public component, not the nine named pairs.
const badge = ({ forwardedRef = true } = {}) => `"use client"

import * as React from "react"

interface BadgeProps extends Omit<React.ComponentProps<"span">, "children" | "ref"> {
  children: React.ReactNode
  ref?: React.Ref<HTMLSpanElement>
}

function Badge({ children, ref, ...props }: BadgeProps) {
  return <span data-slot="badge"${forwardedRef ? " ref={ref}" : ""} {...props}>{children}</span>
}

export { Badge, type BadgeProps }
`

test("a stateless public component is judged on the same contract", () => {
  const result = check({
    "src/pagopa-ui.ts": `export * from "./components/badge"\n`,
    "src/components/badge.tsx": badge(),
  })
  assert.deepEqual(result.problems, [])
  assert.equal(result.summary, "0 stateful component(s), 0 exempt")
})

test("a stateless component that stops forwarding its ref fails", () => {
  hasProblem(
    check({
      "src/pagopa-ui.ts": `export * from "./components/badge"\n`,
      "src/components/badge.tsx": badge({ forwardedRef: false }),
    }),
    /badge\.tsx: Badge: ref is declared but never forwarded/,
  )
})

test("a rest object handed to useRender and mergeProps reaches the element", () => {
  const source = `"use client"

import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"

interface CardTitleProps extends Omit<React.ComponentProps<"div">, "children"> {
  children: React.ReactNode
}

function CardTitle({ children, className, ref, ...props }: CardTitleProps) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps({ className }, props, { children, ref }),
    state: { slot: "card-title" },
  })
}

export { CardTitle, type CardTitleProps }
`
  const result = check({
    "src/pagopa-ui.ts": `export * from "./components/card-title"\n`,
    "src/components/card-title.tsx": source,
  })
  assert.deepEqual(result.problems, [])
})
