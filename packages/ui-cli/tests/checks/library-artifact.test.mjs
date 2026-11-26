import assert from "node:assert/strict"
import { test } from "node:test"

import { distributionProblems } from "../../src/checks/library-artifact.ts"

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
