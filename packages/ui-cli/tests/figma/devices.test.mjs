import assert from "node:assert/strict"
import { test } from "node:test"

import {
  checkDevicePolicy,
  declaredDevices,
  deviceAxes,
  deviceOf,
  loadDevicePolicy,
  normalizeDeviceValue,
  requiredDevices,
  validateDevicePolicy,
  variantDevice,
  variantsByDevice,
} from "../../src/figma/devices.ts"

// The vocabulary the tests resolve against. It follows the shape of the
// committed policy (`src/catalog/figma/device-policy.json`) without copying its
// content: the resolver is data-driven, so the fixture declares its own.
const policy = {
  axes: ["Device", "Breakpoint"],
  any: ["Any", "Default"],
  devices: {
    mobile: {
      canonicalWidth: 320,
      defaultLayoutScope: "viewport",
      aliases: ["Mobile", "XS Mobile", "XSMobile"],
    },
    tablet: {
      canonicalWidth: 600,
      defaultLayoutScope: "viewport",
      aliases: ["Tablet", "SM Tablet", "SMTablet", "SM Table", "MD Tablet", "MDTablet"],
      notes: { "SM Table": "the source's own spelling of SM Tablet" },
    },
    desktop: {
      canonicalWidth: 1200,
      defaultLayoutScope: "viewport",
      aliases: ["Desktop", "Descktop", "LG Desktop", "MD Desktop", "XL Desktop", "Device5"],
      notes: { Device5: "the fifth width the source enumerates, i.e. the XL frame" },
    },
  },
}

// A published set with a `Device` axis, the shape the inventory carries.
function deviceSet(nodeId, values, { axis = "Device", variants } = {}) {
  const options = values ?? ["Desktop", "Mobile"]
  return {
    nodeId,
    name: `Set ${nodeId}`,
    properties: { [axis]: { type: "VARIANT", defaultValue: options[0], variantOptions: options } },
    ...(variants ? { variants } : {}),
  }
}

// The fixture vocabulary is deliberately broader than each fixture inventory, so
// the unused-alias warnings are expected: the tests that assert "no warnings"
// assert on the rest.
const unusedAliasWarnings = (warnings) =>
  warnings.filter((warning) => warning.includes("is not used by the inventory"))
const otherWarnings = (warnings) =>
  warnings.filter((warning) => !warning.includes("is not used by the inventory"))

test("an axis value resolves through the policy ignoring case and spaces", () => {
  assert.equal(deviceOf(policy, "Desktop"), "desktop")
  assert.equal(deviceOf(policy, "LG Desktop"), "desktop")
  assert.equal(deviceOf(policy, "XL Desktop"), "desktop")
  assert.equal(deviceOf(policy, "Device5"), "desktop")
  assert.equal(deviceOf(policy, "Descktop"), "desktop")
  assert.equal(deviceOf(policy, "SM Tablet"), "tablet")
  assert.equal(deviceOf(policy, "SMTablet"), "tablet")
  assert.equal(deviceOf(policy, "SM Table"), "tablet")
  assert.equal(deviceOf(policy, "MD Tablet"), "tablet")
  assert.equal(deviceOf(policy, "XS Mobile"), "mobile")
  assert.equal(deviceOf(policy, "xsmobile"), "mobile")
  assert.equal(deviceOf(policy, "  XS   Mobile "), "mobile")
  assert.equal(deviceOf(policy, "Any"), "any")
  assert.equal(deviceOf(policy, "Default"), "any")
  assert.equal(deviceOf(policy, "Tablet"), "tablet")
})

test("an unmapped value is unknown, never a guess", () => {
  assert.equal(deviceOf(policy, "Tablet XL"), "unknown")
  assert.equal(deviceOf(policy, "Less"), "unknown")
  assert.equal(deviceOf(policy, ""), "unknown")
  assert.equal(deviceOf(policy, undefined), "unknown")
  assert.equal(normalizeDeviceValue("XSMobile"), normalizeDeviceValue("xs mobile"))
})

test("every axis value of a fixture inventory resolves through the policy", () => {
  const nodes = [
    deviceSet("1:1", ["Any", "Default", "Desktop", "Mobile"]),
    deviceSet("1:2", ["LG Desktop", "SM Tablet", "XS Mobile"], { axis: "Breakpoint" }),
    // The source mislabels the axis: the values, not the name, are the evidence.
    deviceSet("1:3", ["Desktop", "Mobile"], { axis: "Layout" }),
    // An axis that names no device stays out of the device dimension.
    deviceSet("1:4", ["Small", "Large"], { axis: "Size" }),
    {
      nodeId: "1:5",
      properties: { Device: { type: "VARIANT", defaultValue: "Small", variantOptions: [] } },
    },
  ]
  const { errors, warnings, stats } = checkDevicePolicy(policy, nodes)
  assert.deepEqual(errors, [])
  assert.deepEqual(otherWarnings(warnings), [])
  assert.ok(unusedAliasWarnings(warnings).length > 0)
  assert.equal(stats.sets, 4)
  assert.equal(stats.valuesTotal, 7)
  assert.equal(stats.valuesResolved, 7)
  assert.equal(stats.unmapped, 0)
  assert.equal(stats.declared, 7)
  assert.deepEqual(stats.byDevice, { mobile: 3, tablet: 1, desktop: 3 })
  assert.deepEqual(stats.axisNames.named, ["Device", "Breakpoint"])
  assert.deepEqual(stats.axisNames.derived, ["Layout"])
})

test("an unmapped value fails with the value and the axis in the message", () => {
  const { errors, warnings, unmapped } = checkDevicePolicy({ ...policy, axes: ["Device"] }, [
    deviceSet("1:1", ["Desktop", "Mobile"]),
    deviceSet("1:2", ["Tablet XL", "Mobile"]),
  ])
  assert.equal(errors.length, 1)
  assert.match(errors[0], /value "Tablet XL" on axis "Device"/)
  assert.match(errors[0], /1:2/)
  assert.match(errors[0], /add it to an alias list in src\/catalog\/figma\/device-policy\.json/)
  assert.equal(unmapped.length, 1)
  assert.equal(unmapped[0].value, "Tablet XL")
  // The failure is an error, never a quiet alias or a warning.
  assert.deepEqual(
    warnings.filter((warning) => warning.includes("Tablet XL")),
    [],
  )
})

test("any and Default produce no required device", () => {
  const node = deviceSet("1:1", ["Any", "Default"])
  assert.deepEqual(declaredDevices(policy, node), [])
  assert.deepEqual(requiredDevices(policy, node), [])
  const { errors, stats } = checkDevicePolicy({ ...policy, axes: ["Device"] }, [node])
  assert.deepEqual(errors, [])
  assert.equal(stats.declared, 0)
})

test("a declared axis the inventory never uses fails; an unused alias only warns", () => {
  const nodes = [deviceSet("1:1", ["Desktop", "Mobile"])]
  const { errors, warnings } = checkDevicePolicy(policy, nodes)
  assert.equal(errors.length, 1)
  assert.match(errors[0], /declares the axis "Breakpoint": the inventory never uses it/)
  const unused = unusedAliasWarnings(warnings)
    .map((warning) => warning.match(/the alias "([^"]+)"/)[1])
    .sort()
  const used = new Set(["desktop", "mobile"])
  const expected = [
    ...Object.values(policy.devices).flatMap((definition) => definition.aliases),
    ...policy.any,
  ]
    .filter((alias) => !used.has(normalizeDeviceValue(alias)))
    .sort()
  assert.deepEqual(unused, expected)
})

test("two devices claiming one alias fail", () => {
  const clashing = {
    ...policy,
    devices: {
      ...policy.devices,
      tablet: { ...policy.devices.tablet, aliases: [...policy.devices.tablet.aliases, "Device5"] },
    },
  }
  const { errors } = checkDevicePolicy(clashing, [deviceSet("1:1", ["Desktop", "Mobile"])])
  assert.ok(
    errors.some((error) => /alias "Device5" is claimed by tablet and desktop/.test(error)),
    errors.join("\n"),
  )
})

test("a device-like value on a non-device axis warns without failing", () => {
  const nodes = [
    deviceSet("1:1", ["First page", "Mobile", "Last page"], { axis: "Order" }),
    deviceSet("1:2", ["Desktop", "Mobile"]),
  ]
  const { errors, warnings } = checkDevicePolicy({ ...policy, axes: ["Device"] }, nodes)
  assert.deepEqual(errors, [])
  const order = warnings.find((warning) => warning.includes('declares "Mobile"'))
  assert.ok(order, warnings.join("\n"))
  assert.match(order, /the "Order" axis of 1:1 declares "Mobile"/)
  assert.match(order, /not a device axis/)
  // A generic `Default` on a list axis is not a device statement.
  const plain = checkDevicePolicy({ ...policy, axes: ["Device"] }, [
    deviceSet("1:1", ["Default", "Big"], { axis: "Size" }),
    deviceSet("1:2", ["Desktop", "Mobile"]),
  ])
  assert.deepEqual(
    plain.warnings.filter((warning) => /declares "Default"/.test(warning)),
    [],
  )
})

test("a reasoned ignored value suppresses the device-like warning", () => {
  const nodes = [
    deviceSet("1:1", ["First page", "Mobile", "Last page"], { axis: "Order" }),
    deviceSet("1:2", ["Desktop", "Mobile"]),
  ]
  const ignored = {
    ...policy,
    axes: ["Device"],
    ignoredValues: [
      {
        axis: "Order",
        value: "Mobile",
        reason: "the value names a page position, not a device",
      },
    ],
  }
  const { errors, warnings } = checkDevicePolicy(ignored, nodes)
  assert.deepEqual(errors, [])
  assert.deepEqual(
    warnings.filter((warning) => warning.includes('declares "Mobile"')),
    [],
  )
})

test("an ignored value no non-device axis declares is a stale exception", () => {
  const ignored = {
    ...policy,
    axes: ["Device"],
    ignoredValues: [
      {
        axis: "Order",
        value: "Mobile",
        reason: "the value names a page position, not a device",
      },
    ],
  }
  const { errors } = checkDevicePolicy(ignored, [deviceSet("1:1", ["Desktop", "Mobile"])])
  assert.ok(
    errors.some((error) =>
      /ignored value "Mobile" on the "Order" axis matches no non-device axis/.test(error),
    ),
    errors.join("\n"),
  )
})

test("a duplicated ignored axis/value is an error", () => {
  const ignored = {
    ...policy,
    axes: ["Device"],
    ignoredValues: [
      { axis: "Order", value: "Mobile", reason: "first" },
      { axis: "order", value: "mobile", reason: "second" },
    ],
  }
  const nodes = [
    deviceSet("1:1", ["Desktop", "Mobile"]),
    deviceSet("1:2", ["First page", "Mobile"], { axis: "Order" }),
  ]
  const { errors } = checkDevicePolicy(ignored, nodes)
  assert.ok(
    errors.some((error) =>
      /the ignored value "mobile" on the "order" axis is listed twice/.test(error),
    ),
    errors.join("\n"),
  )
})

test("the policy shape is validated, notes included", () => {
  assert.throws(
    () => validateDevicePolicy({ ...policy, axis: ["Device"] }, "fixture.json"),
    /fixture\.json: unknown key "axis"/,
  )
  assert.throws(
    () =>
      validateDevicePolicy({
        ...policy,
        devices: { ...policy.devices, tablet: { ...policy.devices.tablet, alias: ["Tablet"] } },
      }),
    /unknown key "alias"/,
  )
  assert.throws(
    () =>
      validateDevicePolicy({
        ...policy,
        devices: {
          ...policy.devices,
          tablet: { ...policy.devices.tablet, notes: { "Not An Alias": "reason" } },
        },
      }),
    /notes names "Not An Alias", which is not one of its aliases/,
  )
  assert.throws(
    () =>
      validateDevicePolicy({
        ...policy,
        devices: {
          ...policy.devices,
          mobile: { ...policy.devices.mobile, defaultLayoutScope: "page" },
        },
      }),
    /defaultLayoutScope must be one of viewport \| container/,
  )
  assert.throws(
    () =>
      validateDevicePolicy({
        ...policy,
        devices: { ...policy.devices, mobile: { ...policy.devices.mobile, canonicalWidth: "320" } },
      }),
    /canonicalWidth must be a positive integer/,
  )
})

test("a variant name resolves to the device its own axis declares", () => {
  const node = deviceSet("1:1", ["Desktop", "Mobile"], { axis: "Layout" })
  assert.equal(variantDevice(policy, node, "Layout=Desktop").device, "desktop")
  assert.equal(variantDevice(policy, node, "Layout=Mobile").device, "mobile")
  assert.equal(variantDevice(policy, { properties: node.properties }, "Layout=Any").device, null)
  // A set with no device axis (and no device values) never claims a device.
  assert.equal(
    variantDevice(policy, deviceSet("1:2", ["Small", "Large"], { axis: "Size" }), "Size=Small")
      .device,
    null,
  )
  // The leading `*` of a required property is not part of the axis name.
  const required = {
    nodeId: "1:3",
    properties: {
      "* Device": {
        type: "VARIANT",
        defaultValue: "Desktop",
        variantOptions: ["Desktop", "Mobile"],
      },
    },
  }
  assert.equal(variantDevice(policy, required, "* Device=Mobile").device, "mobile")
})

test("the per-variant records decide the declared devices once they exist", () => {
  const axisOnly = deviceSet("1:1", ["Desktop", "Mobile"])
  assert.deepEqual(declaredDevices(policy, axisOnly), ["mobile", "desktop"])
  const recorded = deviceSet("1:1", ["Desktop", "Mobile"], {
    variants: [
      { nodeId: "1:10", name: "Device=Mobile", device: "mobile", box: { width: 320, height: 40 } },
      {
        nodeId: "1:11",
        name: "Device=Desktop",
        device: "desktop",
        box: { width: 1200, height: 40 },
      },
    ],
  })
  assert.deepEqual(declaredDevices(policy, recorded), ["mobile", "desktop"])
  const groups = variantsByDevice(recorded)
  assert.deepEqual([...groups.keys()], ["mobile", "desktop"])
  assert.equal(groups.get("mobile")[0].box.width, 320)
})

test("the device axes of a node are named or derived from their values", () => {
  const named = deviceAxes(policy, deviceSet("1:1", ["Any", "Default"]))
  assert.deepEqual(
    named.map((axis) => [axis.token, axis.named]),
    [["Device", true]],
  )
  const derived = deviceAxes(policy, deviceSet("1:2", ["Desktop", "Mobile"], { axis: "Layout" }))
  assert.deepEqual(
    derived.map((axis) => [axis.token, axis.named]),
    [["Layout", false]],
  )
  const none = deviceAxes(policy, deviceSet("1:3", ["Compact", "Extended"], { axis: "Layout" }))
  assert.deepEqual(none, [])
  const mixed = deviceAxes(policy, deviceSet("1:4", ["Desktop", "Less"], { axis: "Property 1" }))
  assert.deepEqual(mixed, [])
})

test("the committed policy covers the committed inventory", () => {
  const committed = loadDevicePolicy()
  assert.ok(committed.axes.length > 0)
  assert.ok(Object.keys(committed.devices).length >= 3)
})
