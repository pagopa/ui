import { z } from "zod"

import { NodeIdSchema, NonEmptyStringSchema, PinnedVersionSchema } from "./common.ts"

// The rules ledger and the live extraction share the same card identity
// (`nodeId`) but not the same fields: the extraction carries the Italian body,
// the ledger carries the English translation and the decision. Keeping the two
// schemas apart is what keeps the Italian prose out of the repository.

// A card lives inside a `.Regole` instance, so its REST id is an instance path
// (`I123:3565;52:895`), not a canonical node id. It is stable for as long as the
// card sits in that container, which is the identity the ledger needs.
export const CardIdSchema = z.string().regex(/^[A-Za-z0-9:;._-]+$/, "expected a rule card id")

export const RuleSectionSchema = z.enum(["Consolidate", "Da commentare"])
export type RuleSection = z.infer<typeof RuleSectionSchema>

export const RuleDispositionSchema = z.enum([
  "imported",
  "recorded",
  "duplicate",
  "out-of-scope",
  "deferred",
  "conflict",
  "pending",
  "removed",
])
export type RuleDisposition = z.infer<typeof RuleDispositionSchema>

export const RuleScopeSchema = z.enum(["component", "foundation", "template", "product"])
export type RuleScope = z.infer<typeof RuleScopeSchema>

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected a YYYY-MM-DD date")

// A short digest of the card's source text: the title and the body, whitespace
// collapsed. Any edit to either reopens the card for review.
export const SourceHashSchema = z
  .string()
  .regex(/^[a-f0-9]{16}$/, "expected the first 16 hex characters of a SHA-256 digest")

export const RuleCardSchema = z
  .strictObject({
    pageId: NodeIdSchema,
    page: z.string(),
    container: NodeIdSchema,
    section: RuleSectionSchema.nullable(),
    status: z.string(),
    title: NonEmptyStringSchema,
    titleEn: NonEmptyStringSchema.optional(),
    summary: NonEmptyStringSchema.optional(),
    sourceHash: SourceHashSchema,
    targets: z.array(NodeIdSchema).default([]),
    scope: RuleScopeSchema.default("component"),
    disposition: RuleDispositionSchema,
    provisionalTargets: z.boolean().optional(),
    duplicateOf: CardIdSchema.optional(),
    guide: NonEmptyStringSchema.optional(),
    reason: NonEmptyStringSchema.optional(),
    request: NonEmptyStringSchema.optional(),
    reviewedAt: DateSchema.optional(),
    removedAt: DateSchema.optional(),
    figmaVersion: PinnedVersionSchema.optional(),
  })
  .superRefine((card, ctx) => {
    const fail = (field: string, message: string): void => {
      ctx.addIssue({ code: "custom", path: [field], message })
    }
    if (card.scope === "component" && card.targets.length === 0 && !card.provisionalTargets) {
      fail("targets", "a component rule needs at least one target node")
    }
    if (card.disposition === "pending") return
    if (!card.titleEn) fail("titleEn", "every reviewed rule needs an English title")
    if (card.disposition === "imported") {
      if (!card.summary) fail("summary", "an imported rule needs a summary")
      if (!card.guide) fail("guide", "an imported rule needs a guide")
      if (!card.reviewedAt) fail("reviewedAt", "an imported rule needs a review date")
    }
    if (card.disposition === "recorded") {
      if (!card.summary) fail("summary", "a recorded rule needs a summary")
      if (!card.reviewedAt) fail("reviewedAt", "a recorded rule needs a review date")
    }
    if (card.disposition === "duplicate") {
      if (!card.duplicateOf) fail("duplicateOf", "a duplicate names its canonical card")
      if (!card.summary) fail("summary", "a duplicate keeps a summary")
    }
    if (card.disposition === "out-of-scope" || card.disposition === "deferred") {
      if (!card.reason) fail("reason", `${card.disposition} rules need a reason`)
    }
    if (card.disposition === "conflict") {
      if (!card.request) fail("request", "a conflict names its design request")
      if (!card.reviewedAt) fail("reviewedAt", "a conflict needs a review date")
    }
    if (card.disposition === "removed" && !card.removedAt) {
      fail("removedAt", "a removed rule records when it disappeared")
    }
  })

export type RuleCard = z.infer<typeof RuleCardSchema>

export const RulesLedgerSchema = z.strictObject({
  schemaVersion: z.literal(1),
  fileKey: NonEmptyStringSchema,
  cards: z.record(CardIdSchema, RuleCardSchema),
})
export type RulesLedger = z.infer<typeof RulesLedgerSchema>

// The live extraction. It is local and git-ignored: it carries the Italian body
// the agent translates, and the version it was read from.
export const ExtractedCardSchema = z.strictObject({
  nodeId: CardIdSchema,
  title: NonEmptyStringSchema,
  body: z.string(),
  status: z.string(),
  section: RuleSectionSchema.nullable(),
  placeholder: z.boolean(),
})
export type ExtractedCard = z.infer<typeof ExtractedCardSchema>

export const ExtractedContainerSchema = z.strictObject({
  nodeId: NodeIdSchema,
  cards: z.array(ExtractedCardSchema),
})
export type ExtractedContainer = z.infer<typeof ExtractedContainerSchema>

export const ExtractedPageSchema = z.strictObject({
  pageId: NodeIdSchema,
  // Figma allows an empty page name; the id stays the identity.
  pageName: z.string(),
  containers: z.array(ExtractedContainerSchema),
})
export type ExtractedPage = z.infer<typeof ExtractedPageSchema>

export const RulesSnapshotSchema = z.strictObject({
  fileKey: NonEmptyStringSchema,
  version: PinnedVersionSchema,
  fetchedAt: NonEmptyStringSchema,
  pages: z.array(ExtractedPageSchema),
})
export type RulesSnapshot = z.infer<typeof RulesSnapshotSchema>

// A comment thread, flattened to what the brief needs. The snapshot is local
// too: comments are a conversation, not a repository artefact.
export const CommentThreadSchema = z.strictObject({
  id: NonEmptyStringSchema,
  nodeId: NodeIdSchema.nullable(),
  author: z.string(),
  createdAt: NonEmptyStringSchema,
  resolvedAt: z.string().nullable(),
  message: z.string(),
  replies: z.array(
    z.strictObject({
      id: NonEmptyStringSchema,
      author: z.string(),
      createdAt: NonEmptyStringSchema,
      message: z.string(),
    }),
  ),
})
export type CommentThread = z.infer<typeof CommentThreadSchema>

export const CommentsSnapshotSchema = z.strictObject({
  fileKey: NonEmptyStringSchema,
  version: PinnedVersionSchema,
  fetchedAt: NonEmptyStringSchema,
  threads: z.array(CommentThreadSchema),
})
export type CommentsSnapshot = z.infer<typeof CommentsSnapshotSchema>
