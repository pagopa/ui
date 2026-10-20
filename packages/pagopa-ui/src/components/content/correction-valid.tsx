import { Tag } from "./tag"

function CorrectionValid({
  label = "EVENTO RETTIFICATO",
}: {
  /** Visible label. @default "EVENTO RETTIFICATO" */
  label?: string
}) {
  return <Tag status="success">{label}</Tag>
}

export { CorrectionValid }
