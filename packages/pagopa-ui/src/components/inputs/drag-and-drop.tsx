"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { Icon } from "@/components/icons/icon"
import { Default as CheckCircleIcon } from "@/components/icons/generated/check-circle"
import { Default as CloseIcon } from "@/components/icons/generated/close"
import { Default as ErrorOutlinedIcon } from "@/components/icons/generated/error"
import { Default as UploadIcon } from "@/components/icons/generated/upload"
import { Button, buttonVariants } from "@/components/primitives/button"
import { Progress } from "@/components/primitives/progress"

import { FieldLabel, FieldMessages } from "./field"
import { describedBy, useFieldIds, useFormReset, type FieldStateProps } from "./field-utils"

// The native `files` list is the submission source. Real browsers accept the
// DataTransfer assignment; some test drivers expose `files` as a getter-only
// property, where the rendered state stays authoritative instead.
function replaceInputFiles(input: HTMLInputElement, next: File[]) {
  try {
    const transfer = new DataTransfer()
    for (const file of next) transfer.items.add(file)
    input.files = transfer.files
  } catch {
    // Keep the current native list; the UI already reflects the change.
  }
}

export interface DragAndDropProps extends Omit<FieldStateProps, "label"> {
  id?: string
  /** Visible field label. @default messages.dragAndDrop.label */
  label?: React.ReactNode
  accept?: string
  multiple?: boolean
  name?: string
  className?: string
  onFilesChange?: (files: File[]) => void
  /** Processing state: the card shows the progress loader and the cancel action. */
  loading?: boolean
  onCancel?: () => void
  /** Failed state; shows the retry action. */
  failed?: boolean
  onRetry?: () => void
  /** "avatar" renders the logo-upload composition with a caller preview slot. */
  variant?: "file" | "avatar"
  preview?: React.ReactNode
  helper?: React.ReactNode
  /** Announced name of the progress loader. @default messages.dragAndDrop.loadingLabel */
  loadingLabel?: string
  /** Visible text of the processing state. @default messages.dragAndDrop.loadingText */
  loadingText?: string
  /** Accessible name of the selected-files list. @default messages.dragAndDrop.filesLabel */
  filesLabel?: string
  /** Visible text of the failed state. @default messages.dragAndDrop.failedText */
  failedText?: string
  /** Visible text while the field is disabled. @default messages.dragAndDrop.disabledText */
  disabledText?: string
  /** Visible text while a file hovers the drop area. @default messages.dragAndDrop.draggingText */
  draggingText?: string
  /** Visible invitation of the resting drop area. @default messages.dragAndDrop.idleText */
  idleText?: string
  /**
   * Hint under the invitation, from whether multiple files are allowed: the
   * caller owns the complete sentence. @default built-in Italian hint
   */
  selectionHint?: (multiple: boolean) => string
  /** Visible label of the file picker. @default messages.dragAndDrop.uploadLabel */
  uploadLabel?: string
  /** Visible label of the avatar picker. @default messages.dragAndDrop.uploadLogoLabel */
  uploadLogoLabel?: string
  /** Processing action text. @default messages.dragAndDrop.cancelLabel */
  cancelLabel?: string
  /** Failed action text. @default messages.dragAndDrop.retryLabel */
  retryLabel?: string
  /**
   * Complete meta line of a selected file (type and size): the caller receives
   * the file and owns the phrase. @default messages.dragAndDrop.fileMeta
   */
  fileMeta?: (file: File) => string
  /** Accessible name of a file's remove control, from the file name. @default messages.dragAndDrop.removeFileLabel */
  removeFileLabel?: (fileName: string) => string
  /** Validation message for more files than the field accepts. @default messages.dragAndDrop.singleFileError */
  singleFileError?: string
  /** Validation message for a rejected format, from the file name. @default messages.dragAndDrop.invalidFormatError */
  invalidFormatError?: (fileName: string) => string
}

function DragAndDrop({
  id,
  label: labelProp,
  description,
  error,
  success,
  required,
  requiredLabel,
  disabled,
  accept,
  multiple,
  name,
  className,
  onFilesChange,
  loading = false,
  onCancel,
  failed = false,
  onRetry,
  variant = "file",
  preview,
  helper,
  loadingLabel: loadingLabelProp,
  loadingText: loadingTextProp,
  filesLabel: filesLabelProp,
  failedText: failedTextProp,
  disabledText: disabledTextProp,
  draggingText: draggingTextProp,
  idleText: idleTextProp,
  selectionHint = (multiple) => (multiple ? "Puoi selezionare più file" : "Seleziona un file"),
  uploadLabel: uploadLabelProp,
  uploadLogoLabel: uploadLogoLabelProp,
  cancelLabel: cancelLabelProp,
  retryLabel: retryLabelProp,
  fileMeta: fileMetaProp,
  removeFileLabel: removeFileLabelProp,
  singleFileError: singleFileErrorProp,
  invalidFormatError: invalidFormatErrorProp,
}: DragAndDropProps) {
  const t = useMessages("dragAndDrop")
  const label = labelProp ?? t.label
  const loadingLabel = loadingLabelProp ?? t.loadingLabel
  const loadingText = loadingTextProp ?? t.loadingText
  const filesLabel = filesLabelProp ?? t.filesLabel
  const failedText = failedTextProp ?? t.failedText
  const disabledText = disabledTextProp ?? t.disabledText
  const draggingText = draggingTextProp ?? t.draggingText
  const idleText = idleTextProp ?? t.idleText
  const uploadLabel = uploadLabelProp ?? t.uploadLabel
  const uploadLogoLabel = uploadLogoLabelProp ?? t.uploadLogoLabel
  const cancelLabel = cancelLabelProp ?? t.cancelLabel
  const retryLabel = retryLabelProp ?? t.retryLabel
  const fileMeta = fileMetaProp ?? t.fileMeta
  const removeFileLabel = removeFileLabelProp ?? t.removeFileLabel
  const singleFileError = singleFileErrorProp ?? t.singleFileError
  const invalidFormatError = invalidFormatErrorProp ?? t.invalidFormatError

  const ids = useFieldIds(id)
  const [dragging, setDragging] = React.useState(false)
  const [files, setFiles] = React.useState<File[]>([])
  const [uploadError, setUploadError] = React.useState<string>()
  const inputRef = React.useRef<HTMLInputElement>(null)
  useFormReset(inputRef, () => {
    setFiles([])
    setDragging(false)
    setUploadError(undefined)
    inputRef.current?.setCustomValidity("")
    onFilesChange?.([])
  })
  const state = { description, error: error || uploadError, success }

  function updateFiles(input: HTMLInputElement) {
    const next = Array.from(input.files ?? [])
    const formats =
      accept
        ?.split(",")
        .map((format) => format.trim().toLowerCase())
        .filter(Boolean) ?? []
    const invalid = next.find(
      (file) =>
        formats.length &&
        !formats.some((format) =>
          format.startsWith(".")
            ? file.name.toLowerCase().endsWith(format)
            : format.endsWith("/*")
              ? file.type.toLowerCase().startsWith(format.slice(0, -1))
              : file.type.toLowerCase() === format,
        ),
    )
    const message =
      !multiple && next.length > 1
        ? singleFileError
        : invalid
          ? invalidFormatError(invalid.name)
          : undefined
    if (message) {
      replaceInputFiles(input, files)
      input.setCustomValidity(message)
      setUploadError(message)
      return
    }
    input.setCustomValidity("")
    setUploadError(undefined)
    setFiles(next)
    onFilesChange?.(next)
  }

  function removeFile(target: File) {
    const input = inputRef.current
    if (!input) return
    const next = files.filter((file) => file !== target)
    replaceInputFiles(input, next)
    setFiles(next)
    onFilesChange?.(next)
  }

  const input = (
    <input
      ref={inputRef}
      id={ids.controlId}
      type="file"
      name={name}
      required={required}
      disabled={disabled}
      accept={accept}
      multiple={multiple}
      aria-invalid={Boolean(state.error) || undefined}
      aria-describedby={describedBy(ids, state)}
      onChange={(event) => updateFiles(event.currentTarget)}
      className="pui:absolute pui:inset-0 pui:size-full pui:cursor-pointer pui:opacity-0 pui:disabled:cursor-not-allowed"
    />
  )

  return (
    <div data-slot="drag-and-drop" className="pui:grid pui:gap-1.5">
      <FieldLabel
        htmlFor={ids.controlId}
        label={label}
        required={required}
        requiredLabel={requiredLabel}
        disabled={disabled}
      />
      {variant === "avatar" ? (
        <div
          className={cn(
            "pui:relative pui:grid pui:justify-items-center pui:gap-4 pui:rounded-lg pui:border pui:border-secondary pui:bg-muted pui:p-6 pui:text-center pui:focus-within:outline-2 pui:focus-within:outline-offset-2 pui:focus-within:outline-ring",
            className,
          )}
        >
          {!loading ? input : null}
          {preview ? <div aria-hidden={loading || undefined}>{preview}</div> : null}
          <span className={cn(buttonVariants({ variant: "default" }), "pui:pointer-events-none")}>
            {uploadLogoLabel}
          </span>
          {helper ? (
            <span className="pui:text-caption-sb pui:text-muted-foreground">{helper}</span>
          ) : null}
        </div>
      ) : (
        <div
          data-dragging={dragging}
          data-status={loading ? "processing" : failed || state.error ? "failed" : "default"}
          className={cn(
            "group pui:relative pui:grid pui:min-h-24 pui:place-items-center pui:rounded-lg pui:border pui:border-drop-target pui:bg-accent pui:p-6 pui:text-center",
            "pui:focus-within:border-ring pui:focus-within:outline-2 pui:focus-within:outline-offset-2 pui:focus-within:outline-ring",
            "pui:data-[dragging=true]:bg-dragging-surface",
            disabled && "pui:cursor-not-allowed",
            (failed || state.error) && "pui:border-error-border pui:bg-error-soft",
            loading && "pui:gap-6 pui:border-secondary pui:bg-background",
            className,
          )}
          onDragEnter={(event) => {
            event.preventDefault()
            if (!disabled && !loading) setDragging(true)
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            const related = event.relatedTarget
            if (!(related instanceof Node) || !event.currentTarget.contains(related)) {
              setDragging(false)
            }
          }}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            const target = inputRef.current
            if (!disabled && !loading && target) {
              target.files = event.dataTransfer.files
              target.dispatchEvent(new Event("change", { bubbles: true }))
            }
          }}
        >
          {!loading && !failed ? input : null}
          {loading ? (
            <div className="pui:pointer-events-none pui:grid pui:w-full pui:justify-items-center pui:gap-4">
              <p className="pui:text-body-sb">{loadingText}</p>
              <Progress value={null} className="pui:h-1" aria-label={loadingLabel} />
            </div>
          ) : failed ? (
            <div className="pui:pointer-events-none pui:grid pui:justify-items-center pui:gap-2">
              <Icon source={ErrorOutlinedIcon} size={24} className="pui:text-error-foreground" />
              <span className="pui:text-body-sb">{failedText}</span>
            </div>
          ) : (
            <div className="pui:pointer-events-none pui:grid pui:justify-items-center pui:gap-2">
              <Icon
                source={UploadIcon}

                className={cn(
                  "pui:size-6",
                  disabled ? "pui:text-muted-foreground" : "pui:text-foreground",
                )}
              />
              <div className="pui:grid pui:justify-items-center pui:gap-6">
                <div className="pui:grid pui:gap-1">
                  <span
                    className={cn(
                      "pui:text-body-sb",
                      disabled ? "pui:text-muted-foreground" : "pui:text-foreground",
                    )}
                  >
                    {disabled ? disabledText : dragging ? draggingText : idleText}
                  </span>
                  <span className="pui:text-caption-sb pui:text-muted-foreground">
                    {selectionHint(Boolean(multiple))}
                  </span>
                </div>
                {disabled || dragging ? null : (
                  <span
                    className={cn(
                      buttonVariants({ variant: "default" }),
                      "pui:pointer-events-none",
                    )}
                  >
                    {uploadLabel}
                  </span>
                )}
              </div>
            </div>
          )}
          {loading && onCancel ? (
            <Button variant="outline" className="pui:pointer-events-auto" onClick={onCancel}>
              {cancelLabel}
            </Button>
          ) : null}
          {failed && onRetry ? (
            <Button variant="destructive" className="pui:pointer-events-auto" onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
        </div>
      )}
      {files.length ? (
        <ul aria-label={filesLabel} className="pui:grid pui:gap-2">
          {files.map((file) => (
            <li
              key={`${file.name}-${file.lastModified}`}
              className="pui:flex pui:items-start pui:gap-2.5 pui:rounded-lg pui:border pui:border-secondary pui:bg-background pui:p-6"
            >
              <Icon source={CheckCircleIcon} size={24} className="pui:shrink-0 pui:text-success" />
              <div className="pui:grid pui:min-w-0 pui:flex-1 pui:gap-1">
                <p className="pui:truncate pui:text-body-sb pui:break-all">{file.name}</p>
                <p className="pui:text-label-mini pui:text-muted-foreground">{fileMeta(file)}</p>
              </div>
              <button
                type="button"
                aria-label={removeFileLabel(file.name)}
                onClick={() => removeFile(file)}
                className="pui:relative pui:grid pui:size-6 pui:shrink-0 pui:place-items-center pui:rounded-full pui:text-foreground pui:after:absolute pui:after:-inset-2.5 pui:hover:bg-muted pui:focus-visible:outline-2 pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"
              >
                <Icon source={CloseIcon} className="pui:size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="pui:px-6">
        <FieldMessages ids={ids} {...state} />
      </div>
    </div>
  )
}

export { DragAndDrop }
