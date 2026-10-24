"use client"

import * as React from "react"

/**
 * Shared state contract of the labelled fields (text, select, date, choice and
 * drag-and-drop): the visible label, the three message channels and the native
 * required/disabled states.
 */
interface FieldStateProps {
  /** Visible field label; also the control's accessible name. */
  label: React.ReactNode
  /** Supporting copy under the control, linked through `aria-describedby`. */
  description?: React.ReactNode
  /** Error copy: replaces `description` and sets `aria-invalid` when set. */
  error?: React.ReactNode
  /** Success copy, announced only while `error` is absent. */
  success?: React.ReactNode
  /** Marks the control required: native `required` plus its marker. */
  required?: boolean
  /** Visible suffix of a required label. @default "(obbligatorio)" */
  requiredLabel?: string
  /** Native disabled state; the label follows the control. */
  disabled?: boolean
}

/**
 * Shared shape of the labelled choice fields (checkbox, radio, switch): the
 * shared field state plus caller-owned `id`/`className`, with the label
 * required.
 */
type ChoiceFieldProps = Omit<FieldStateProps, "label"> & {
  /** Visible option label; also the control's accessible name. */
  label: React.ReactNode
  /** Id applied to the control, so an external label can target it; generated when omitted. */
  id?: string
  /** ClassName applied to the field's root grid. */
  className?: string
}

function useFieldIds(id?: string) {
  const generatedId = React.useId()
  const controlId = id ?? generatedId

  return {
    controlId,
    descriptionId: `${controlId}-description`,
    errorId: `${controlId}-error`,
    successId: `${controlId}-success`,
  }
}

function describedBy(
  ids: ReturnType<typeof useFieldIds>,
  state: Pick<FieldStateProps, "description" | "error" | "success">,
  external?: string,
) {
  return (
    [
      external,
      state.description ? ids.descriptionId : undefined,
      state.error ? ids.errorId : undefined,
      state.success && !state.error ? ids.successId : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined
  )
}

export { useFormReset, useInputRef } from "@/components/primitives/form-control-utils"
export { describedBy, useFieldIds, type ChoiceFieldProps, type FieldStateProps }
