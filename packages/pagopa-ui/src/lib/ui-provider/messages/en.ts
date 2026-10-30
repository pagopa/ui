// The English dictionary: a complete translation of the default one, with the
// same keys and function signatures. Plain, short UI English.
import { formatFileSize } from "./format"
import type { Messages } from "./types"

const avatarStatusLabels = {
  online: "online",
  offline: "offline",
  busy: "busy",
}

function stepperStatusLabel(status: "complete" | "current" | "upcoming" | undefined) {
  return status === "complete" ? "Completed" : status === "current" ? "Current step" : "To do"
}

export const enMessages: Messages = {
  attachmentModule: {
    downloadLabel: "Download",
  },
  checkoutModule: {
    legacyTitle: "Payment data",
    legacyDescription: "Description",
    legacySuggestion: "Suggested because you are already a customer",
    noticeCodeLabel: "Notice code",
    continueLabel: "Continue",
    editLabel: "Edit",
  },
  paymentModule: {
    downloadLabel: "Download",
  },
  productModule: {
    actionLabel: "Update documents",
    legacyStatusLabel: "Default",
  },
  avatar: {
    statusLabel: (status) => `Status: ${avatarStatusLabels[status]}`,
    selectedLabel: "Selected",
  },
  correctionTag: {
    validLabel: "RECTIFIED EVENT",
    notValidLabel: "INVALID EVENT",
  },
  image: {
    fallbackLabel: "Image not available",
  },
  paymentProviderLogos: {
    label: "Payment service providers",
  },
  productCard: {
    actionLabel: "Learn more",
  },
  tableListItem: {
    actionFallbackLabel: "Open",
  },
  tableList: {
    actionFallbackLabel: "Open",
    emptyLabel: "No results",
  },
  table: {
    selectionLabel: "Select all rows",
    notificationLabel: "Unread notification",
    actionsLabel: "Actions",
    emptyLabel: "No results",
  },
  timeline: {
    label: "Timeline",
  },
  banner: {
    dismissLabel: "Close banner",
  },
  errorState: {
    codeLabel: "Error code",
    copyLabel: (label) => `Copy ${label.toLowerCase()}`,
    copiedLabel: "Code copied",
    copyErrorLabel: "The code could not be copied. Copy it manually.",
  },
  headerAlert: {
    dismissLabel: "Close alert",
  },
  progressLoader: {
    label: "Progress",
  },
  scrollToBottom: {
    label: "Go to bottom",
  },
  snackbarErrorCode: {
    message: "An error occurred",
    copyLabel: "Copy code",
    copiedLabel: "Code copied",
    copyErrorLabel: "The code could not be copied. Copy it manually.",
  },
  snackbar: {
    dismissLabel: "Close notification",
  },
  autocomplete: {
    emptyLabel: "No results",
    clearLabel: "Clear field",
    counterLabel: (count) => `${count} selected`,
    removeValueLabel: (value) => `Remove ${value}`,
    clearAllLabel: "Clear all values",
    openLabel: "open list",
    closeLabel: "close list",
    loadingLabel: "Loading list",
  },
  datePicker: {
    label: "Select date",
    selectionText: (formattedDate) => `Selected: ${formattedDate}`,
    emptySelectionText: "No date selected",
    missingDateError: "Select a date before saving.",
    missingEndDateError: "Select the end date before saving.",
    cancelLabel: "Cancel",
    confirmLabel: "Save",
  },
  dragAndDrop: {
    label: "Upload file",
    loadingLabel: "Uploading",
    loadingText: "Uploading...",
    filesLabel: "Selected files",
    failedText: "Upload failed",
    disabledText: "Upload unavailable",
    draggingText: "Drop here to upload",
    idleText: "Drag files here or select them",
    uploadLabel: "Upload file",
    uploadLogoLabel: "Upload logo",
    cancelLabel: "Cancel",
    retryLabel: "Retry",
    fileMeta: (file) => `${file.type || "File"} · ${formatFileSize(file.size)}`,
    removeFileLabel: (fileName) => `Remove ${fileName}`,
    singleFileError: "Select one file only.",
    invalidFormatError: (fileName) => `Format not allowed: ${fileName}.`,
  },
  errorSummary: {
    title: "Check the highlighted fields",
  },
  floatingFieldLabel: {
    requiredLabel: "(required)",
  },
  fieldLabel: {
    requiredLabel: "(required)",
  },
  dropdown: {
    emptyTitle: "No matches",
    backLabel: "Back",
    loadingLabel: "Loading",
  },
  menuDropdown: {
    accessibleLabel: "Open menu",
  },
  authenticationCodeInput: {
    label: "Authentication code",
    slotLabel: ({ index, total }) => `Character ${index + 1} of ${total}`,
  },
  datePickerField: {
    panelLabel: "Select date",
  },
  accordion: {
    ariaLabel: "More details",
    label: "Loading",
    loadingLabel: "Loading",
  },
  carouselStepper: {
    label: "Select content",
    getControlLabel: (index, count) => `Content ${index + 1} of ${count}`,
  },
  buttonGroup: {
    ariaLabel: "Actions",
  },
  segmentedControl: {
    ariaLabel: "Selection",
  },
  stickyButtonBar: {
    ariaLabel: "Form actions",
  },
  breadcrumb: {
    ariaLabel: "Breadcrumb",
  },
  cookies: {
    closeLabel: "Close",
    label: "Cookie preferences",
  },
  footer: {
    brand: "PagoPA",
    columnsLabel: "Footer links",
  },
  pagination: {
    label: "Pagination",
    previousLabel: "Previous page",
    nextLabel: "Next page",
    pageLabel: (page) => `Page ${page}`,
  },
  preheader: {
    institution: "PagoPA S.p.A.",
    linksLabel: "Institutional links",
  },
  sideNav: {
    title: "In this section",
  },
  skipToMainContent: {
    children: "Skip to main content",
  },
  stepper: {
    navigationLabel: "Progress",
    completedLabel: "Completed:",
    statusLabel: (status) => stepperStatusLabel(status),
    indicatorLabel: (status) => `${stepperStatusLabel(status)}:`,
    stepLabel: ({ index, total, label, status }, statusLabel) =>
      `Step ${index} of ${total}: ${label} — ${statusLabel(status)}`,
  },
  cameraView: {
    label: "Frame the code",
    announcement: ({ label, active }) => `${label}. ${active ? "Camera on" : "Camera off"}`,
  },
  dialog: {
    closeLabel: "Close dialog",
  },
  drawer: {
    closeLabel: "Close panel",
  },
  overlay: {
    label: "Loading",
  },
  popover: {
    label: "Contextual information",
    closeLabel: "Close popover",
  },
  timelineDrawer: {
    title: "Timeline",
    description: "Events in chronological order",
  },
}
