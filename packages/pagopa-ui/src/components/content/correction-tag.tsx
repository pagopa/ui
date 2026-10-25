import { Tag } from "./tag"

/**
 * Correction outcome tag: the source `Correction/Valid` and
 * `Correction/NotValid` components, one status tag with the source glyph.
 *
 * Figma: Correction/Valid (node 9676:5453)
 * Figma: Correction/NotValid (node 9676:5455)
 */
function CorrectionTag({
  status,
  label = status === "valid" ? "EVENTO RETTIFICATO" : "EVENTO NON VALIDO",
}: {
  /** Correction outcome: rettificato (`valid`) or non valido (`not-valid`). */
  status: "valid" | "not-valid"
  /** Visible label. @default "EVENTO RETTIFICATO" / "EVENTO NON VALIDO" */
  label?: string
}) {
  return <Tag status={status === "valid" ? "success" : "warning"}>{label}</Tag>
}

export { CorrectionTag }
