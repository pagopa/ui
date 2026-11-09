import { z } from "zod"

import { NodeIdSchema, StatusSchema } from "./common.ts"

// The consumer map: the one artifact a consuming agent reads to learn which
// React component renders a Figma node. It is generated from the catalogue and
// ships inside the package, so the schema is also the contract with the
// `pagopa-ui-map` command line that reads it: a key this file does not declare
// is a mistake on one side of the boundary, not a gap to tolerate.

export const MapNodeSchema = z.strictObject({
  // The Figma side, omitted when the pinned snapshot no longer lists the node
  // (a registry entry may outlive the snapshot it was written against).
  figma: z.string().optional(),
  page: z.string().optional(),
  type: z.enum(["COMPONENT", "COMPONENT_SET"]).optional(),
  status: StatusSchema,
  // The exports that render it, sorted; empty means the node maps to no
  // component at all (`excluded`), which is a decision the agent reads too.
  exports: z.array(z.string()),
  // The Storybook id of the story that draws it (`<title>--<export>`), so the
  // consumer opens the reference implementation instead of guessing its shape.
  story: z.string().optional(),
  // Why the node is not a component: the reviewed reason of an excluded entry.
  reason: z.string().optional(),
})

export const FigmaMapSchema = z.strictObject({
  schemaVersion: z.literal(1),
  // The Figma file the snapshot came from, so a consumer can tell a layout of
  // this library from a layout of another one.
  fileKey: z.string(),
  syncedAt: z.string(),
  nodes: z.record(NodeIdSchema, MapNodeSchema),
  // The reverse index over the public API: every exported value of the package,
  // with the nodes that render it. An empty list says "this component has no
  // Figma source", which is an answer, not a hole.
  exports: z.record(z.string(), z.array(NodeIdSchema)),
})

export type MapNode = z.infer<typeof MapNodeSchema>
export type FigmaMap = z.infer<typeof FigmaMapSchema>
