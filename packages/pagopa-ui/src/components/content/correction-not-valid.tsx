import { Tag } from "./tag"

function CorrectionNotValid({
  label = "EVENTO NON VALIDO",
}: {
  /** Visible label. @default "EVENTO NON VALIDO" */
  label?: string
}) {
  return <Tag status="warning">{label}</Tag>
}

export { CorrectionNotValid }
