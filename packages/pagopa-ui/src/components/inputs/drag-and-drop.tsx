"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"
import { FileUp, X } from "@/components/primitives/icons"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
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
}: Omit<FieldStateProps, "label"> & {
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
}) {
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
      className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
    />
  )

  return (
    <div className="grid gap-1.5">
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
            "relative grid justify-items-center gap-4 rounded-lg border border-secondary bg-muted p-6 text-center focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
            className,
          )}
        >
          {!loading ? input : null}
          {preview ? <div aria-hidden={loading || undefined}>{preview}</div> : null}
          <span className={cn(buttonVariants({ variant: "default" }), "pointer-events-none")}>
            {uploadLogoLabel}
          </span>
          {helper ? <span className="text-caption-sb text-muted-foreground">{helper}</span> : null}
        </div>
      ) : (
        <div
          data-dragging={dragging}
          data-status={loading ? "processing" : failed || state.error ? "failed" : "default"}
          className={cn(
            "group relative grid min-h-24 place-items-center rounded-lg border border-drop-target bg-accent p-6 text-center",
            "focus-within:border-ring focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
            "data-[dragging=true]:bg-dragging-surface",
            disabled && "cursor-not-allowed",
            (failed || state.error) && "border-error-border bg-error-soft",
            loading && "gap-6 border-secondary bg-background",
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
            <div className="pointer-events-none grid w-full justify-items-center gap-4">
              <p className="text-body-sb">{loadingText}</p>
              <Progress value={null} className="h-1" aria-label={loadingLabel} />
            </div>
          ) : failed ? (
            <div className="pointer-events-none grid justify-items-center gap-2">
              <PagoPAIcon name="error" filled={false} size={24} className="text-error-foreground" />
              <span className="text-body-sb">{failedText}</span>
            </div>
          ) : (
            <div className="pointer-events-none grid justify-items-center gap-2">
              <FileUp
                aria-hidden="true"
                className={cn("size-6", disabled ? "text-muted-foreground" : "text-foreground")}
              />
              <div className="grid justify-items-center gap-6">
                <div className="grid gap-1">
                  <span
                    className={cn(
                      "text-body-sb",
                      disabled ? "text-muted-foreground" : "text-foreground",
                    )}
                  >
                    {disabled ? disabledText : dragging ? draggingText : idleText}
                  </span>
                  <span className="text-caption-sb text-muted-foreground">
                    {selectionHint(Boolean(multiple))}
                  </span>
                </div>
                {disabled || dragging ? null : (
                  <span
                    className={cn(buttonVariants({ variant: "default" }), "pointer-events-none")}
                  >
                    {uploadLabel}
                  </span>
                )}
              </div>
            </div>
          )}
          {loading && onCancel ? (
            <Button variant="outline" className="pointer-events-auto" onClick={onCancel}>
              {cancelLabel}
            </Button>
          ) : null}
          {failed && onRetry ? (
            <Button variant="destructive" className="pointer-events-auto" onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
        </div>
      )}
      {files.length ? (
        <ul aria-label={filesLabel} className="grid gap-2">
          {files.map((file) => (
            <li
              key={`${file.name}-${file.lastModified}`}
              className="flex items-start gap-2.5 rounded-lg border border-secondary bg-background p-6"
            >
              <PagoPAIcon name="check_circle" size={24} className="shrink-0 text-success" />
              <div className="grid min-w-0 flex-1 gap-1">
                <p className="truncate text-body-sb break-all">{file.name}</p>
                <p className="text-label-mini text-muted-foreground">{fileMeta(file)}</p>
              </div>
              <button
                type="button"
                aria-label={removeFileLabel(file.name)}
                onClick={() => removeFile(file)}
                className="relative grid size-6 shrink-0 place-items-center rounded-full text-foreground after:absolute after:-inset-2.5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="px-6">
        <FieldMessages ids={ids} {...state} />
      </div>
    </div>
  )
}

export { DragAndDrop }
