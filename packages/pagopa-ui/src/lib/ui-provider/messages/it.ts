// The default dictionary: the Italian copy every component falls back to when
// neither a prop nor a configured provider overrides it. A value that depends
// on data is a function with the signature of the prop it feeds.
import { formatFileSize } from "./format"
import type { Messages } from "./types"

const avatarStatusLabels = {
  online: "online",
  offline: "non in linea",
  busy: "occupato",
}

function stepperStatusLabel(status: "complete" | "current" | "upcoming" | undefined) {
  return status === "complete"
    ? "Completato"
    : status === "current"
      ? "Passaggio corrente"
      : "Da completare"
}

export const itMessages: Messages = {
  attachmentModule: {
    downloadLabel: "Scarica",
  },
  checkoutModule: {
    legacyTitle: "Payment data",
    legacyDescription: "Description",
    legacySuggestion: "Suggerito perché sei già cliente",
    noticeCodeLabel: "Codice avviso",
    continueLabel: "Continua",
    editLabel: "Modifica",
  },
  paymentModule: {
    downloadLabel: "Scarica",
  },
  productModule: {
    actionLabel: "Aggiorna documenti",
    legacyStatusLabel: "Default",
  },
  avatar: {
    statusLabel: (status) => `Stato: ${avatarStatusLabels[status]}`,
    selectedLabel: "Selezionato",
  },
  image: {
    fallbackLabel: "Immagine non disponibile",
  },
  paymentProviderLogos: {
    label: "Prestatori di servizi di pagamento",
  },
  productCard: {
    actionLabel: "Scopri di più",
  },
  tableListItem: {
    actionFallbackLabel: "Apri",
  },
  tableList: {
    actionFallbackLabel: "Apri",
    emptyLabel: "Nessun risultato",
  },
  table: {
    selectionLabel: "Seleziona tutte le righe",
    notificationLabel: "Notifica non letta",
    actionsLabel: "Azioni",
    emptyLabel: "Nessun risultato",
  },
  timeline: {
    label: "Cronologia",
  },
  banner: {
    dismissLabel: "Chiudi avviso",
  },
  errorState: {
    codeLabel: "Codice errore",
    copyLabel: (label) => `Copia ${label.toLowerCase()}`,
    copiedLabel: "Codice copiato",
    copyErrorLabel: "Impossibile copiare il codice. Copialo manualmente.",
  },
  headerAlert: {
    dismissLabel: "Chiudi avviso",
  },
  progressLoader: {
    label: "Avanzamento",
  },
  scrollToBottom: {
    label: "Vai in fondo",
  },
  snackbarErrorCode: {
    message: "Si è verificato un errore",
    copyLabel: "Copia codice",
    copiedLabel: "Codice copiato",
    copyErrorLabel: "Impossibile copiare il codice. Copialo manualmente.",
  },
  snackbar: {
    dismissLabel: "Chiudi notifica",
  },
  autocomplete: {
    emptyLabel: "Nessun risultato",
    clearLabel: "Svuota campo",
    openLabel: "apri lista",
    closeLabel: "chiudi lista",
    loadingLabel: "Caricamento lista in corso",
  },
  datePicker: {
    label: "Seleziona data",
    selectionText: (formattedDate) => `Selezione: ${formattedDate}`,
    emptySelectionText: "Nessuna data selezionata",
    missingDateError: "Seleziona una data prima di salvare.",
    missingEndDateError: "Seleziona la data di fine prima di salvare.",
    cancelLabel: "Annulla",
    confirmLabel: "Salva",
  },
  dragAndDrop: {
    label: "Carica file",
    loadingLabel: "Caricamento in corso",
    loadingText: "Caricamento in corso...",
    filesLabel: "File selezionati",
    failedText: "Caricamento fallito",
    disabledText: "Caricamento non disponibile",
    draggingText: "Rilascia qui per caricare",
    idleText: "Trascina qui i file o selezionali",
    uploadLabel: "Carica il file",
    uploadLogoLabel: "Carica il logo",
    cancelLabel: "Annulla",
    retryLabel: "Riprova",
    fileMeta: (file) => `${file.type || "File"} · ${formatFileSize(file.size)}`,
    removeFileLabel: (fileName) => `Rimuovi ${fileName}`,
    singleFileError: "Seleziona un solo file.",
    invalidFormatError: (fileName) => `Formato non consentito: ${fileName}.`,
  },
  errorSummary: {
    title: "Controlla i campi segnalati",
  },
  floatingFieldLabel: {
    requiredLabel: "(obbligatorio)",
  },
  fieldLabel: {
    requiredLabel: "(obbligatorio)",
  },
  dropdown: {
    emptyTitle: "Non ci sono corrispondenze",
    backLabel: "Indietro",
    loadingLabel: "Caricamento in corso",
  },
  menuDropdown: {
    accessibleLabel: "Apri menu",
  },
  authenticationCodeInput: {
    label: "Codice di autenticazione",
    slotLabel: ({ index, total }) => `Carattere ${index + 1} di ${total}`,
  },
  datePickerField: {
    panelLabel: "Seleziona data",
  },
  accordion: {
    ariaLabel: "Approfondimenti",
    label: "Caricamento in corso",
    loadingLabel: "Caricamento in corso",
  },
  carouselStepper: {
    label: "Seleziona contenuto",
    getControlLabel: (index, count) => `Contenuto ${index + 1} di ${count}`,
  },
  buttonGroup: {
    ariaLabel: "Azioni",
  },
  segmentedControl: {
    ariaLabel: "Selezione",
  },
  stickyButtonBar: {
    ariaLabel: "Azioni del modulo",
  },
  breadcrumb: {
    ariaLabel: "Percorso di navigazione",
  },
  cookies: {
    closeLabel: "Chiudi",
    label: "Preferenze cookie",
  },
  footer: {
    brand: "PagoPA",
    columnsLabel: "Collegamenti del piè di pagina",
  },
  pagination: {
    label: "Paginazione",
    previousLabel: "Pagina precedente",
    nextLabel: "Pagina successiva",
    pageLabel: (page) => `Pagina ${page}`,
  },
  preheader: {
    institution: "PagoPA S.p.A.",
    linksLabel: "Link istituzionali",
  },
  sideNav: {
    title: "In questa sezione",
  },
  skipToMainContent: {
    children: "Vai al contenuto principale",
  },
  stepper: {
    navigationLabel: "Avanzamento",
    completedLabel: "Completato:",
    statusLabel: (status) => stepperStatusLabel(status),
    indicatorLabel: (status) => `${stepperStatusLabel(status)}:`,
    stepLabel: ({ index, total, label, status }, statusLabel) =>
      `Passaggio ${index} di ${total}: ${label} — ${statusLabel(status)}`,
  },
  cameraView: {
    label: "Inquadra il codice",
    announcement: ({ label, active }) =>
      `${label}. ${active ? "Fotocamera attiva" : "Fotocamera non attiva"}`,
  },
  dialog: {
    closeLabel: "Chiudi finestra",
  },
  drawer: {
    closeLabel: "Chiudi pannello",
  },
  overlay: {
    label: "Caricamento",
  },
  popover: {
    label: "Informazione contestuale",
    closeLabel: "Chiudi popover",
  },
  timelineDrawer: {
    title: "Cronologia",
    description: "Eventi in ordine cronologico",
  },
}
