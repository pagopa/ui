"use client"

import * as React from "react"

import { useMessages } from "@/lib/ui-provider"

import { Tag } from "./tag"

/** Props of the correction outcome tag. */
export interface CorrectionTagProps extends Omit<React.ComponentProps<"span">, "children"> {
  /** Correction outcome: rettificato (`valid`) or non valido (`not-valid`). */
  status: "valid" | "not-valid"
  /**
   * Visible label. @default messages.correctionTag.validLabel on `valid`,
   * messages.correctionTag.notValidLabel on `not-valid`
   */
  label?: string
  /** ClassName applied to the tag surface. */
  className?: string
}

/**
 * Correction outcome tag: the source `Correction/Valid` and
 * `Correction/NotValid` components, one status tag with the source glyph.
 *
 * Figma: Correction/Valid (node 9676:5453)
 * Figma: Correction/NotValid (node 9676:5455)
 */
function CorrectionTag({ status, label: labelProp, className, ref, ...props }: CorrectionTagProps) {
  const t = useMessages("correctionTag")
  const label = labelProp ?? (status === "valid" ? t.validLabel : t.notValidLabel)
  return (
    <Tag
      {...props}
      ref={ref}
      data-slot="correction-tag"
      status={status === "valid" ? "success" : "warning"}
      className={className}
    >
      {label}
    </Tag>
  )
}

export { CorrectionTag }
