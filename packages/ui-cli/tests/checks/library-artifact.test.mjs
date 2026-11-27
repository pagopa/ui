import assert from "node:assert/strict"
import { test } from "node:test"

import { demoGeometryProblems, distributionProblems } from "../../src/checks/library-artifact.ts"

const MIT = `MIT License

Copyright (c) 2026 PagoPA S.p.A.

Permission is hereby granted, free of charge, to any person obtaining a copy
`

function manifest(overrides = {}) {
  return {
    name: "@pagopa/ui",
    license: "MIT",
    publishConfig: { access: "public", registry: "https://npm.pkg.github.com" },
    exports: { "./styles.css": "./dist/styles.css" },
    peerDependencies: { react: "^19.0.0", "react-dom": "^19.0.0" },
    ...overrides,
  }
}

const licences = { root: MIT, package: MIT }

test("an MIT package published publicly to GitHub Packages on a ^19.0.0 peer has no problem", () => {
  assert.deepEqual(distributionProblems(manifest(), licences), [])
})

test("UNLICENSED in the manifest is a problem", () => {
  const problems = distributionProblems(manifest({ license: "UNLICENSED" }), licences)
  assert.deepEqual(problems, ['license is "UNLICENSED", expected "MIT"'])
})

test("a publishConfig that does not target GitHub Packages publicly is a problem", () => {
  const problems = distributionProblems(manifest({ publishConfig: {} }), licences)
  assert.deepEqual(problems, [
    'publishConfig.access must be "public"',
    "publishConfig.registry must be https://npm.pkg.github.com",
  ])
})

test("a peer range narrower than React 19 is a problem", () => {
  const problems = distributionProblems(
    manifest({ peerDependencies: { react: "^19.2.0", "react-dom": "^19.2.0" } }),
    licences,
  )
  assert.deepEqual(problems, ["react peer must be ^19.0.0", "react-dom peer must be ^19.0.0"])
})

test("a missing or non-MIT LICENSE is a problem in both locations", () => {
  const problems = distributionProblems(manifest(), { root: null, package: "UNLICENSED" })
  assert.deepEqual(problems, [
    "missing LICENSE at the repository root",
    "the LICENSE at the package is not the MIT text",
  ])
})

const DEMO_PREVIEW = `.pagopa-ui-root {
  --artboard-height-tall: 800px;
  --login-width: 520px;
  --grid-aside: 20rem;
}`

test("a demo custom property declared by the preview sheet cannot reach the published CSS", () => {
  const published = `.pagopa-ui-root {
  --dialog-width: 600px;
  --artboard-height-tall: 800px;
}`
  assert.deepEqual(demoGeometryProblems(published, { demo: [DEMO_PREVIEW], library: [] }), [
    "--artboard-height-tall",
  ])
})

test("component geometry the preview sheet never declares is not demo", () => {
  const published = `.pagopa-ui-root {
  --dialog-width: 600px;
  --pui-camera-size: 376px;
}`
  assert.deepEqual(demoGeometryProblems(published, { demo: [DEMO_PREVIEW], library: [] }), [])
})

test("a preview sheet with no geometry of its own leaves the published CSS alone", () => {
  assert.deepEqual(
    demoGeometryProblems(".pagopa-ui-root { --dialog-width: 600px; }", { demo: [""], library: [] }),
    [],
  )
})

// The regression #159 shipped: the variable was only ever read by a template,
// so it never reached the preview sheet and a sheet-to-sheet comparison had
// nothing to match.
test("a demo template reading a published property that no component reads is demo geometry", () => {
  const published = `.pagopa-ui-root {
  --pui-dialog-width: 600px;
  --pui-dialog-width-compact: 272px;
}`
  const template = `<div className="pui:max-w-(--pui-dialog-width-compact)" />`
  const component = `<div className="pui:w-(--pui-dialog-width)" />`
  assert.deepEqual(demoGeometryProblems(published, { demo: [template], library: [component] }), [
    "--pui-dialog-width-compact",
  ])
})

test("a property both a component and a demo read stays published", () => {
  const published = `.pagopa-ui-root { --pui-artboard-height: 650px; }`
  assert.deepEqual(
    demoGeometryProblems(published, {
      demo: ['<div className="pui:min-h-(--pui-artboard-height)" />'],
      library: ['<div className="pui:min-h-(--pui-artboard-height)" />'],
    }),
    [],
  )
})
