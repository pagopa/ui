// The shape of the message dictionary: one entry per component, grouped by
// family in the same order the package exports its families. Every leaf takes
// the type of the prop it feeds, so a component that reads a key and a
// dictionary that misses it fail at compile time.
//
// A leaf that depends on data stays a function with the signature of the prop:
// the caller composes the sentence, including its word order and punctuation.

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => string
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}

type StepperStatus = "complete" | "current" | "upcoming" | undefined

export interface Messages {
  // composites
  attachmentModule: {
    downloadLabel: string
  }
  checkoutModule: {
    legacyTitle: string
    legacyDescription: string
    legacySuggestion: string
    noticeCodeLabel: string
    continueLabel: string
    editLabel: string
  }
  paymentModule: {
    downloadLabel: string
  }
  productModule: {
    actionLabel: string
    legacyStatusLabel: string
  }
  // content
  avatar: {
    statusLabel: (status: "online" | "offline" | "busy") => string
    selectedLabel: string
  }
  image: {
    fallbackLabel: string
  }
  paymentProviderLogos: {
    label: string
  }
  // data-display
  productCard: {
    actionLabel: string
  }
  tableListItem: {
    actionFallbackLabel: string
  }
  tableList: {
    actionFallbackLabel: string
    emptyLabel: string
  }
  table: {
    selectionLabel: string
    notificationLabel: string
    actionsLabel: string
    emptyLabel: string
  }
  timeline: {
    label: string
  }
  // feedback
  banner: {
    dismissLabel: string
  }
  errorState: {
    codeLabel: string
    copyLabel: (label: string) => string
    copiedLabel: string
    copyErrorLabel: string
  }
  headerAlert: {
    dismissLabel: string
  }
  progressLoader: {
    label: string
  }
  scrollToBottom: {
    label: string
  }
  snackbarErrorCode: {
    message: string
    copyLabel: string
    copiedLabel: string
    copyErrorLabel: string
  }
  snackbar: {
    dismissLabel: string
  }
  // inputs
  autocomplete: {
    emptyLabel: string
    clearLabel: string
    openLabel: string
    closeLabel: string
    loadingLabel: string
  }
  datePicker: {
    label: string
    selectionText: (formattedDate: string) => string
    emptySelectionText: string
    missingDateError: string
    missingEndDateError: string
    cancelLabel: string
    confirmLabel: string
  }
  dragAndDrop: {
    label: string
    loadingLabel: string
    loadingText: string
    filesLabel: string
    failedText: string
    disabledText: string
    draggingText: string
    idleText: string
    uploadLabel: string
    uploadLogoLabel: string
    cancelLabel: string
    retryLabel: string
    fileMeta: (file: File) => string
    removeFileLabel: (fileName: string) => string
    singleFileError: string
    invalidFormatError: (fileName: string) => string
  }
  errorSummary: {
    title: string
  }
  floatingFieldLabel: {
    requiredLabel: string
  }
  fieldLabel: {
    requiredLabel: string
  }
  dropdown: {
    emptyTitle: string
    backLabel: string
    loadingLabel: string
  }
  menuDropdown: {
    accessibleLabel: string
  }
  authenticationCodeInput: {
    label: string
    slotLabel: (slot: { index: number; total: number }) => string
  }
  datePickerField: {
    panelLabel: string
  }
  // navigation
  accordion: {
    ariaLabel: string
    label: string
    loadingLabel: string
  }
  carouselStepper: {
    label: string
    getControlLabel: (index: number, count: number) => string
  }
  buttonGroup: {
    ariaLabel: string
  }
  segmentedControl: {
    ariaLabel: string
  }
  stickyButtonBar: {
    ariaLabel: string
  }
  breadcrumb: {
    ariaLabel: string
  }
  cookies: {
    closeLabel: string
    label: string
  }
  footer: {
    brand: string
    columnsLabel: string
  }
  pagination: {
    label: string
    previousLabel: string
    nextLabel: string
    pageLabel: (page: number) => string
  }
  preheader: {
    institution: string
    linksLabel: string
  }
  sideNav: {
    title: string
  }
  skipToMainContent: {
    children: string
  }
  stepper: {
    navigationLabel: string
    completedLabel: string
    statusLabel: (status: StepperStatus) => string
    indicatorLabel: (status: StepperStatus) => string
    stepLabel: (
      step: { index: number; total: number; label: string; status?: StepperStatus },
      statusLabel: (status: StepperStatus) => string,
    ) => string
  }
  // overlays
  cameraView: {
    label: string
    announcement: (state: { label: string; active: boolean }) => string
  }
  dialog: {
    closeLabel: string
  }
  drawer: {
    closeLabel: string
  }
  overlay: {
    label: string
  }
  popover: {
    label: string
    closeLabel: string
  }
  timelineDrawer: {
    title: string
    description: string
  }
}
