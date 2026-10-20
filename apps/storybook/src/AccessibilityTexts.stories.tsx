import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { AttachmentModule } from "@/components/composites/attachment-module"
import { CheckoutModule } from "@/components/composites/checkout-module"
import { PaymentModule } from "@/components/composites/payment-module"
import { ProgressKpi } from "@/components/data-display/progress-kpi"
import { Avatar } from "@/components/content/avatar"
import { Table } from "@/components/data-display/table"
import { TableListItem } from "@/components/data-display/table-list-item"
import { Accordion } from "@/components/navigation/accordion"
import { Banner } from "@/components/feedback/banner"
import { HeaderAlert } from "@/components/feedback/header-alert"
import { KOState } from "@/components/feedback/ko-state"
import { Snackbar } from "@/components/feedback/snackbar"
import { SnackbarErrorCode } from "@/components/feedback/snackbar-error-code"
import { Autocomplete } from "@/components/inputs/autocomplete"
import { Cookies } from "@/components/navigation/cookies"
import { Footer } from "@/components/navigation/footer"
import { Pagination } from "@/components/navigation/pagination"
import { Preheader } from "@/components/navigation/preheader"
import { Stepper } from "@/components/navigation/stepper"
import { Button } from "@/components/primitives/button"
import {
  AuthenticationCodeInput,
  DatePickerField,
  TextField,
} from "@/components/inputs/text-fields"
import { DragAndDrop } from "@/components/inputs/drag-and-drop"
import { CameraViewElement } from "@/components/overlays/camera-view-element"
import { Dialog } from "@/components/overlays/dialog"
import { Drawer } from "@/components/overlays/drawer"
import { Popover } from "@/components/overlays/popover"
import { TimelineDrawer } from "@/components/overlays/timeline-drawer"

// Every text a component announces is reachable from the caller: these stories
// replace each built-in Italian default with a value the caller owns and assert
// the announced outcome. A default the consumer cannot replace would fail here.
const meta = {
  title: "Components/Accessibility",
  parameters: {
    docs: {
      description: {
        component:
          "The text contract: visible and assistive strings are props with Italian defaults, forwarded to the element that announces them; data-dependent phrases arrive as functions that return the complete text.",
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const DisclosureLabels: Story = {
  render: () => (
    <Popover
      defaultOpen
      trigger={<Button>Dettagli</Button>}
      label="Approfondimento su misura"
      closeLabel="Chiudi approfondimento"
    >
      Testo del pannello.
    </Popover>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvasElement.ownerDocument.querySelector(
        '[role="dialog"][aria-label="Approfondimento su misura"]',
      ),
    ).not.toBeNull()
    await expect(
      canvasElement.ownerDocument.querySelector('[aria-label="Chiudi approfondimento"]'),
    ).not.toBeNull()
    await expect(canvas.getByRole("button", { name: "Dettagli" })).toBeVisible()
    // Close the panel before the shared contract runs: its reflow condition
    // belongs to the closed page.
    await userEvent.keyboard("{Escape}")
  },
}

export const DialogCloseLabel: Story = {
  render: () => (
    <Dialog
      trigger={<Button>Apri dialog</Button>}
      title="Titolo del dialog"
      closeLabel="Chiudi su richiesta"
    >
      Corpo del dialog.
    </Dialog>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Apri dialog" }))
    await waitFor(async () =>
      expect(await screen.findByRole("button", { name: "Chiudi su richiesta" })).toBeVisible(),
    )
  },
}

export const DrawerCloseLabel: Story = {
  render: () => (
    <Drawer
      defaultOpen
      trigger={<Button>Apri pannello</Button>}
      title="Titolo del pannello"
      closeLabel="Chiudi il pannello"
    >
      Corpo del pannello.
    </Drawer>
  ),
  play: async ({ canvasElement }) => {
    await expect(await screen.findByRole("button", { name: "Chiudi il pannello" })).toBeVisible()
    await expect(canvasElement.querySelectorAll('[aria-label="Chiudi pannello"]')).toHaveLength(0)
  },
}

export const NoticeLabels: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div className="grid max-w-xl gap-4">
      <Banner title="Avviso su misura" onDismiss={() => undefined} dismissLabel="Nascondi avviso">
        Copy dell'avviso.
      </Banner>
      <HeaderAlert onDismiss={() => undefined} dismissLabel="Nascondi striscia">
        Aggiornamento in corso.
      </HeaderAlert>
      <Snackbar
        message="Operazione completata"
        onDismiss={() => undefined}
        dismissLabel="Nascondi esito"
      />
      <SnackbarErrorCode code="3020123456789" copyLabel="Copia il codice" />
      <KOState
        title="Esito negativo"
        description="Nessun addebito effettuato."
        code="ERR-1"
        copyLabel={(label) => `Prendi ${label}`}
        copiedLabel="Codice preso"
        copyErrorLabel="Copia a mano, per favore."
      />
      <Cookies
        onAccept={() => undefined}
        onReject={() => undefined}
        onLearnMore={() => undefined}
        onDismiss={() => undefined}
        label="Consenso cookies su misura"
        closeLabel="Chiudi la barra"
      >
        Copy della barra.
      </Cookies>
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const label of [
      "Nascondi avviso",
      "Nascondi striscia",
      "Nascondi esito",
      "Copia il codice",
      "Chiudi la barra",
      "Prendi Codice errore",
    ])
      await expect(canvasElement.querySelector(`[aria-label="${label}"]`)).not.toBeNull()
    await expect(
      canvasElement.querySelector('section[aria-label="Consenso cookies su misura"]'),
    ).not.toBeNull()
  },
}

export const NavigationTexts: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div className="grid max-w-3xl gap-6">
      <Pagination
        currentPage={1}
        totalPages={3}
        onPageChange={() => undefined}
        label="Navigazione a pagine"
        previousLabel="Vai indietro"
        nextLabel="Vai avanti"
        pageLabel={(page) => `Apri pagina ${page}`}
      />
      <Preheader
        links={[{ label: "Accessibilità", href: "#a" }]}
        linksLabel="Collegamenti su misura"
      />
      <Footer
        columns={[{ title: "Colonna su misura", links: [{ label: "Voce", href: "#v" }] }]}
        columnsLabel="Piè di pagina su misura"
      />
      <Stepper
        items={[
          { label: "Primo", status: "complete" },
          { label: "Secondo", status: "current" },
        ]}
        navigationLabel="Avanzamento su misura"
        completedLabel="Fatto:"
        statusLabel={(status) => `Stato ${status}`}
        indicatorLabel={(status) => `Tappa ${status}:`}
        stepLabel={({ index, total, label, status }) =>
          `Tappa ${index} su ${total}: ${label} (${status})`
        }
      />
      <Accordion
        items={[{ id: "load", title: "Caricamento", content: "Contenuto", skeleton: true }]}
        loadingLabel="Contenuto in arrivo"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("navigation", { name: "Navigazione a pagine" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Vai indietro" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Vai avanti" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Apri pagina 3" })).toBeVisible()
    await expect(canvas.getByRole("navigation", { name: "Collegamenti su misura" })).toBeVisible()
    await expect(canvas.getByRole("navigation", { name: "Piè di pagina su misura" })).toBeVisible()
    await expect(canvas.getByRole("list", { name: "Avanzamento su misura" })).toBeVisible()
    await expect(canvas.getAllByText("Tappa 1 su 2: Primo (complete)").length).toBeGreaterThan(0)
    await expect(canvas.getByText("Tappa current:")).toBeVisible()
    await expect(canvas.getByText("Contenuto in arrivo")).toBeVisible()
  },
}

export const FieldTexts: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div className="grid max-w-md gap-6">
      <TextField label="Nome" required requiredLabel="(campo obbligatorio)" />
      <AuthenticationCodeInput
        name="code"
        length={4}
        slotLabel={({ index, total }) => `Cifra ${index + 1} di ${total}`}
      />
      <DragAndDrop
        label="Allegato"
        loading
        onCancel={() => undefined}
        loadingLabel="Invio in corso"
        loadingText="Invio in corso..."
        cancelLabel="Interrompi"
      />
      <DragAndDrop
        label="Contratto"
        idleText="Trascina qui il contratto"
        selectionHint={(multiple) => (multiple ? "Più file" : "Un file alla volta")}
        uploadLabel="Scegli il contratto"
        fileMeta={(file) => `${file.name}: ${file.type}`}
        removeFileLabel={(fileName) => `Togli ${fileName}`}
        singleFileError="Solo un documento."
      />
      <DragAndDrop
        label="Ricevuta"
        failed
        onRetry={() => undefined}
        failedText="Invio non riuscito"
        retryLabel="Ritenta l'invio"
      />
      <DatePickerField
        label="Scadenza"
        selectionText={(formattedDate) => `Scelta: ${formattedDate}`}
        emptySelectionText="Nessuna scadenza"
        missingDateError="Scegli una data prima di confermare."
        cancelLabel="Lascia stare"
        confirmLabel="Conferma la data"
      />
      <DatePickerField label="Expiry" locale="en-US" defaultValue="2026-05-12" />
      <Autocomplete
        label="Comune cercato"
        options={[{ value: "roma", label: "Roma" }]}
        emptyLabel="Nessun comune trovato"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("textbox", { name: /campo obbligatorio/ })).toBeVisible()
    await expect(canvasElement.querySelector('[aria-label="Cifra 2 di 4"]')).not.toBeNull()
    await expect(canvas.getByRole("progressbar", { name: "Invio in corso" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Interrompi" })).toBeVisible()
    await expect(canvas.getByText("Invio non riuscito")).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Ritenta l'invio" })).toBeVisible()
    await expect(canvas.getByText("Trascina qui il contratto")).toBeVisible()
    await expect(canvas.getByText("Un file alla volta")).toBeVisible()
    await expect(canvas.getByText("Scegli il contratto")).toBeVisible()
    // A chosen file announces the caller's meta line and remove label; two
    // files on the single-file field report the caller's validation message.
    const fileInputs = canvasElement.querySelectorAll<HTMLInputElement>('input[type="file"]')
    const input = fileInputs[fileInputs.length - 1]
    if (!input) throw new Error("Expected the contract file input")
    const transfer = new DataTransfer()
    transfer.items.add(new File(["x"], "contratto.pdf", { type: "application/pdf" }))
    input.files = transfer.files
    input.dispatchEvent(new Event("change", { bubbles: true }))
    await expect(canvas.getByText("contratto.pdf: application/pdf")).toBeVisible()
    await expect(canvasElement.querySelector('[aria-label="Togli contratto.pdf"]')).not.toBeNull()
    // The calendar panel announces the caller's footer and validation copy.
    await userEvent.click(canvas.getByRole("button", { name: /Scadenza/ }))
    const panel = await screen.findByRole("dialog", { name: "Scadenza" })
    await expect(within(panel).getByText("Nessuna scadenza")).toBeVisible()
    await userEvent.click(within(panel).getByRole("button", { name: "Conferma la data" }))
    await expect(within(panel).getByText("Scegli una data prima di confermare.")).toBeVisible()
    await userEvent.click(within(panel).getByRole("button", { name: "Lascia stare" }))
    // The combobox empty announcement takes the caller's copy; close the
    // popup so the rest of the page is reachable (and axe scans the resting
    // page).
    const search = canvas.getByRole("combobox", { name: /Comune cercato/ })
    await userEvent.type(search, "venezia")
    await expect(await screen.findByText("Nessun comune trovato")).toBeVisible()
    await userEvent.keyboard("{Escape}")
    // The date locale is the caller's: the field and the panel format with it.
    await expect(canvas.getByText("May 12, 2026")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: /Expiry/ }))
    const englishPanel = await screen.findByRole("dialog", { name: "Expiry" })
    await expect(within(englishPanel).getByText("Selezione: May 12, 2026")).toBeVisible()
    await userEvent.keyboard("{Escape}")
  },
}

export const ContentAnnouncements: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div className="grid max-w-xl gap-6">
      <Avatar
        alt="Profilo"
        initials="OR"
        selected
        status="online"
        statusLabel={(status) => `Presenza: ${status}`}
        selectedLabel="Scelto"
      />
      <Table
        caption="Righe su misura"
        actionsLabel="Comandi di riga"
        columns={[{ key: "id", label: "Identificativo" }]}
        rows={[{ id: "r1" }]}
        rowActions={() => <Button>Modifica</Button>}
      />
      <AttachmentModule
        title="Documento"
        onDownload={() => undefined}
        downloadLabel="Scarica documento"
      />
      <PaymentModule
        code="3020123456789"
        onDownload={() => undefined}
        downloadLabel="Scarica avviso"
      />
      <CheckoutModule
        onContinue={() => undefined}
        legacyTitle="Dati di pagamento"
        legacySuggestion="Perché sei già socio"
        continueLabel="Prosegui su misura"
      />
      <ul className="list-none">
        <TableListItem
          fields={[{ label: "Servizio", value: "TARI" }]}
          action={{ onPress: () => undefined }}
          actionFallbackLabel="Apri su misura"
        />
      </ul>
      <ProgressKpi label="Avanzamento" value={1234} total={2000} locale="en-US" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Presenza: online")).toBeVisible()
    await expect(canvas.getByText("Scelto")).toBeVisible()
    const actions = canvasElement.querySelector('[role="columnheader"] .sr-only')
    await expect(actions?.textContent).toBe("Comandi di riga")
    await expect(canvasElement.querySelector('[aria-label="Scarica documento"]')).not.toBeNull()
    await expect(canvasElement.querySelector('[aria-label="Scarica avviso"]')).not.toBeNull()
    await expect(canvas.getByText("Perché sei già socio")).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Prosegui su misura" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Apri su misura" })).toBeVisible()
    // Numbers format with the caller's locale (en-US groups with commas).
    await expect(canvas.getByText("1,234")).toBeVisible()
  },
}

export const OverlayAnnouncements: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div className="grid max-w-xl gap-6">
      <CameraViewElement
        label="Inquadra il QR"
        active={false}
        announcement={({ label, active }) => `${label}: fotocamera ${active ? "accesa" : "spenta"}`}
      />
      <TimelineDrawer
        trigger={<Button>Apri cronologia</Button>}
        title="Storico"
        description="Eventi dal più recente"
        items={[{ id: "sent", title: "Notifica inviata", description: "Protocollo 123" }]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Inquadra il QR: fotocamera spenta")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Apri cronologia" }))
    const panel = await screen.findByRole("dialog", { name: /Storico/ })
    await expect(within(panel).getByText("Eventi dal più recente")).toBeVisible()
    await userEvent.keyboard("{Escape}")
  },
}
