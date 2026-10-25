// This application is copied into a temporary consumer and installed with the
// packed tarball. `__PAGOPA_UI_PACKAGE__` is rewritten with the tarball's
// package name by check-library.mjs: the placeholder keeps the workspace graph
// from reading a test fixture as a dependency on the package under test.
import * as React from "react"
import { createRoot } from "react-dom/client"
import avatarLogo from "./avatar-source-logo.png"
import {
  Autocomplete,
  AuthenticationCodeInput,
  Avatar,
  Breadcrumb,
  Button,
  CheckoutModule,
  Chip,
  CheckboxField,
  DatePicker,
  DatePickerField,
  Dialog,
  Drawer,
  iconNames,
  Image,
  InputChip,
  MenuDropdown,
  MultiSelectField,
  PagoPAIcon,
  PagoPAPictogram,
  Pagination,
  Popover,
  ProductCard,
  Preheader,
  Header,
  Footer,
  RadioField,
  RadioGroup,
  SegmentedControl,
  SelectField,
  Spinner,
  Switch,
  SwitchField,
  Table,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TextareaField,
  type DatePickerRange,
} from "__PAGOPA_UI_PACKAGE__"
import "__PAGOPA_UI_PACKAGE__/styles.css"

const sourceIconVariants = [
  { name: "category", variants: ["unselected", "selected"] },
  { name: "supervised_user_circle", variants: ["unselected", "selected"] },
  { name: "person", variants: ["unselected", "selected"] },
  { name: "mail", variants: ["unselected", "selected"] },
  { name: "settings", variants: ["unselected", "selected"] },
  { name: "vpn_key", variants: ["unselected", "selected"] },
  { name: "view_sidebar", variants: ["unselected", "selected"] },
  { name: "lock", variants: ["closed", "open"] },
  { name: "filter", variants: ["filter-alt", "tune"] },
  { name: "check_box", variants: ["unchecked", "checked", "indeterminate"] },
  { name: "radio_button", variants: ["unchecked", "checked"] },
  { name: "visibility", variants: ["visible", "hidden"] },
  { name: "keep", variants: ["pinned", "unpinned"] },
  { name: "close", variants: ["big", "small"] },
  { name: "add", variants: ["big", "small"] },
  { name: "chevron", variants: ["right", "left", "down", "up"] },
  { name: "arrow", variants: ["right", "left", "down", "up"] },
  { name: "unfold", variants: ["less", "more"] },
  { name: "info", variants: ["outlined", "filled"] },
  { name: "check", variants: ["big", "small"] },
  { name: "error", variants: ["outlined", "filled", "stroke"] },
  { name: "favorite", variants: ["unselected", "selected"] },
  { name: "kid_star", variants: ["unselected", "selected"] },
  { name: "inventory_2", variants: ["outlined", "filled"] },
  { name: "receipt_long", variants: ["active", "inactive"] },
  { name: "Media logos", variants: ["instagram", "linkedin", "threads", "youtube"] },
  { name: "near_me", variants: ["filled", "outlined"] },
  { name: "IO logo", variants: ["light", "dark"] },
  { name: "send", variants: ["filled", "outlined"] },
] satisfies {
  name: React.ComponentProps<typeof PagoPAIcon>["name"]
  variants: NonNullable<React.ComponentProps<typeof PagoPAIcon>["variant"]>[]
}[]

const iconCases = iconNames.flatMap((name) => {
  const variants = sourceIconVariants.find((entry) => entry.name === name)?.variants ?? [undefined]
  return variants.map((variant) => ({ name, variant }))
})

const consumerCityOptions = [
  {
    value: "roma",
    label: "Roma",
    description: "Capitale e provincia di Roma.",
    leading: <Avatar alt="Identità di Roma" size="compact" />,
    chip: (
      <Chip size="compact" variant="highlight">
        Capitale
      </Chip>
    ),
  },
  {
    value: "milano",
    label: "Milano",
    description: "Provincia metropolitana di Milano.",
    leading: <Avatar alt="Identità di Milano" size="compact" />,
    chip: (
      <Chip size="compact" variant="warning">
        Preferita
      </Chip>
    ),
  },
]

function ConsumerTable({ onMenuAction }: { onMenuAction: (action: string) => void }) {
  const [ascending, setAscending] = React.useState(false)
  const [page, setPage] = React.useState(1)
  const [empty, setEmpty] = React.useState(false)
  const rows = (
    page === 1
      ? [
          { id: "tari", service: "TARI", amount: "42,00 euro" },
          { id: "mensa", service: "Mensa scolastica", amount: "18,50 euro" },
        ]
      : [
          { id: "bollo", service: "Bollo auto", amount: "54,00 euro" },
          { id: "ticket", service: "Ticket sanitario", amount: "12,00 euro" },
        ]
  ).toSorted((a, b) => {
    const comparison = a.service.localeCompare(b.service)
    return ascending ? comparison : -comparison
  })
  return (
    <div style={{ minWidth: 0 }}>
      <Table
        caption="Pagamenti dal pacchetto"
        captionHidden
        columns={[
          {
            key: "service",
            label: "Servizio",
            sort: {
              direction: ascending ? "ascending" : "descending",
              onChange: () => setAscending((current) => !current),
            },
          },
          { key: "amount", label: "Importo" },
        ]}
        rows={empty ? [] : rows}
        rowActions={(row) =>
          row.id === "tari" ? (
            <MenuDropdown
              accessibleLabel="Apri azioni del servizio"
              label="Azioni del servizio"
              items={[
                {
                  id: "details",
                  label: "Aggiorna dettagli",
                  description: "Modifica le informazioni principali del servizio.",
                  leading: <PagoPAIcon name="settings" />,
                  chip: (
                    <Chip size="compact" variant="highlight">
                      Rapido
                    </Chip>
                  ),
                  onSelect: () => onMenuAction("Dettagli aggiornati"),
                },
              ]}
            />
          ) : null
        }
        pagination={<Pagination currentPage={page} totalPages={2} onPageChange={setPage} />}
        emptyState={{ title: "Nessun pagamento" }}
      />
      <Button variant="outline" onClick={() => setEmpty((current) => !current)}>
        {empty ? "Mostra dati" : "Mostra stato vuoto"}
      </Button>
    </div>
  )
}

function ConsumerPreferences() {
  const [submitted, setSubmitted] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  return (
    <>
      <form
        aria-label="Preferenze del servizio"
        style={{ display: "grid", gap: 16 }}
        onReset={() => setSubmitted("")}
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))))
        }}
      >
        <CheckboxField label="Accetto i termini" name="accept" required />
        <RadioGroup legend="Canale di conferma" name="contact" defaultValue="email" required>
          <RadioField
            label="Email di conferma"
            value="email"
            leadingIcon={<PagoPAIcon name="notifications_active" />}
            description="Ricevi la conferma via email."
            indicatorPlacement="end"
            loading={loading}
          />
          <RadioField
            label="SMS di conferma"
            value="sms"
            indicatorPlacement="end"
            loading={loading}
          />
          <RadioField
            label="Sportello non disponibile"
            value="office"
            indicatorPlacement="end"
            disabled
            loading={loading}
          />
        </RadioGroup>
        <SwitchField label="Aggiornamenti del servizio" name="updates" defaultChecked />
        <SwitchField label="Notifiche non disponibili" name="unavailable" defaultChecked disabled />
        <AuthenticationCodeInput
          label="Codice di verifica"
          name="verificationCode"
          length={4}
          required
        />
        <Button type="button" variant="outline" onClick={() => setLoading((current) => !current)}>
          {loading ? "Completa caricamento canali" : "Carica canali di conferma"}
        </Button>
        <Button type="submit">Invia preferenze</Button>
        <Button type="reset" variant="outline">
          Ripristina preferenze
        </Button>
      </form>
      <output aria-label="Preferenze inviate" style={{ overflowWrap: "anywhere" }}>
        {submitted}
      </output>
    </>
  )
}

function ConsumerChoiceAction() {
  const [action, setAction] = React.useState("")
  const [actionCount, setActionCount] = React.useState(0)
  const [submitted, setSubmitted] = React.useState("")
  const [submitCount, setSubmitCount] = React.useState(0)

  return (
    <form
      aria-label="Comuni dal pacchetto"
      style={{ display: "grid", gap: 16 }}
      onSubmit={(event) => {
        event.preventDefault()
        setSubmitCount((count) => count + 1)
        setSubmitted(
          new FormData(event.currentTarget).getAll("cities").map(String).sort().join(","),
        )
      }}
    >
      <MultiSelectField
        id="consumer-cities"
        label="Comuni selezionati"
        name="cities"
        defaultValue={["roma"]}
        options={consumerCityOptions}
        action={{
          label: "Usa comuni preferiti",
          leading: <PagoPAIcon name="near_me" />,
          onAction: () => {
            setAction(
              document.querySelector('[role="listbox"][aria-labelledby="consumer-cities-label"]')
                ? "Popup aperto"
                : "Popup chiuso prima dell'azione",
            )
            setActionCount((count) => count + 1)
          },
        }}
      />
      <Button type="submit">Invia selezione dei comuni</Button>
      <output aria-label="Azione dei comuni">{action}</output>
      <output aria-label="Conteggio azioni dei comuni">{actionCount}</output>
      <output aria-label="Comuni inviati dal pacchetto">{submitted}</output>
      <output aria-label="Invii dei comuni dal pacchetto">{submitCount}</output>
    </form>
  )
}

function ConsumerAuthentication() {
  const [masked, setMasked] = React.useState(true)
  const [disabled, setDisabled] = React.useState(false)
  const [completions, setCompletions] = React.useState(0)
  const [submitted, setSubmitted] = React.useState("")
  return (
    <section
      aria-label="Codici di verifica dal pacchetto"
      style={{
        width: 240,
        maxWidth: "100%",
        minWidth: 0,
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        gap: 24,
      }}
    >
      <form
        aria-label="Verifica del codice privato"
        style={{ minWidth: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}
        onReset={() => {
          setSubmitted("")
          setCompletions(0)
        }}
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))))
        }}
      >
        <Button type="button" variant="outline">
          Passa al codice privato
        </Button>
        <p id="consumer-code-policy">Usa il codice ricevuto per questa richiesta.</p>
        <AuthenticationCodeInput
          label="Codice privato"
          name="verificationCode"
          length={5}
          defaultValue="57"
          mask={masked}
          disabled={disabled}
          required
          onValueComplete={() => setCompletions((count) => count + 1)}
          description="Puoi digitare o incollare il codice."
          aria-describedby="consumer-code-policy"
        />
        <Button type="button" variant="outline" onClick={() => setMasked((current) => !current)}>
          {masked ? "Mostra il codice privato" : "Nascondi il codice privato"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setDisabled((current) => !current)}>
          {disabled ? "Abilita il codice privato" : "Disabilita il codice privato"}
        </Button>
        <Button type="submit">Invia codice privato</Button>
        <Button type="reset" variant="outline">
          Ripristina codice privato
        </Button>
        <output aria-label="Codici completati">{completions}</output>
        <output aria-label="Codice privato inviato" style={{ overflowWrap: "anywhere" }}>
          {submitted}
        </output>
      </form>
      <AuthenticationCodeInput
        label="Codice scaduto"
        length={5}
        defaultValue="57391"
        error="Il codice inserito è scaduto."
      />
      <AuthenticationCodeInput
        label="CodiceDiAutenticazioneDellaRichiestaConIdentificativoMoltoLungo"
        description="DescrizioneDelCodiceDiAutenticazioneConUnaParolaMoltoLungaDaNonTagliare"
        defaultValue="573912"
        mask
      />
    </section>
  )
}

function ConsumerAvatars() {
  const [selected, setSelected] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  return (
    <section
      aria-label="Identità dal pacchetto"
      style={{
        width: 240,
        maxWidth: "100%",
        minWidth: 0,
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
        justifyItems: "start",
        gap: 16,
      }}
    >
      <Button variant="outline">Prima dell'Avatar</Button>
      <Avatar
        alt="Servizio culturale non interattivo"
        size="large"
        icon={
          <a href="#consumer-avatar-destination">
            <PagoPAIcon name="theater_comedy" size={33} />
          </a>
        }
      />
      <Button variant="outline">Dopo l'Avatar</Button>
      <p id="consumer-avatar-destination">Le azioni appartengono al contenitore del servizio.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <Avatar alt="Identità piccola installata" size="small" />
        <Avatar alt="Identità intermedia installata" size="medium" />
        <Avatar alt="Identità grande installata" size="large" />
      </div>
      <Avatar
        alt="Marchio del servizio installato"
        src={avatarLogo}
        imageFit="contain"
        size="large"
      />
      <Avatar alt="Fotografia installata" src={productCover} />
      <label
        style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44, maxWidth: "100%" }}
      >
        <input
          type="checkbox"
          aria-label="Associa il prodotto"
          checked={selected}
          onChange={(event) => setSelected(event.currentTarget.checked)}
        />
        <Avatar
          alt="Prodotto selezionabile installato"
          src={avatarLogo}
          imageFit="contain"
          size="small"
          selected={selected}
          loading={loading}
        />
        <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>Associa il prodotto</span>
      </label>
      <Avatar alt="Organizzazione in caricamento installata" size="large" loading={loading} />
      <Button variant="outline" onClick={() => setLoading((current) => !current)}>
        {loading ? "Completa caricamento" : "Carica identità"}
      </Button>
      <div style={{ background: "var(--navy)", borderRadius: 8, padding: 16 }}>
        <Avatar
          alt="Servizio culturale inverso installato"
          icon={<PagoPAIcon name="theater_comedy" size={33} />}
          tone="inverse"
          size="large"
        />
        <Avatar
          alt="Servizio con icona alternativa installato"
          src={failed ? "data:image/png;base64,invalid" : avatarLogo}
          imageFit="contain"
          icon={<PagoPAIcon name="theater_comedy" size={33} />}
          tone="inverse"
          size="large"
        />
      </div>
      <Avatar
        alt="Prodotto principale installato"
        src={avatarLogo}
        imageFit="contain"
        size="small"
        status="busy"
        secondary={{
          alt: "Organizzazione associata installata",
          src: failed ? "data:image/png;base64,invalid" : avatarLogo,
          initials: "OR",
          imageFit: "contain",
        }}
      />
      <Button variant="outline" onClick={() => setFailed((current) => !current)}>
        {failed ? "Ripristina logo" : "Simula logo non valido"}
      </Button>
      <div
        role="group"
        aria-label="Stati delle identità"
        style={{ display: "flex", flexWrap: "wrap", gap: 16 }}
      >
        <Avatar
          alt="Identità online installata"
          icon={<PagoPAIcon name="theater_comedy" size={33} />}
          size="large"
          status="online"
        />
        <Avatar
          alt="Identità offline installata"
          icon={<PagoPAIcon name="theater_comedy" size={33} />}
          size="large"
          status="offline"
        />
        <Avatar
          alt="Identità occupata installata"
          icon={<PagoPAIcon name="theater_comedy" size={33} />}
          size="large"
          status="busy"
        />
      </div>
    </section>
  )
}

function nativeDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
}

function ConsumerCalendars() {
  const [date, setDate] = React.useState(new Date(2026, 4, 11))
  const [range, setRange] = React.useState<DatePickerRange>()
  const [submitted, setSubmitted] = React.useState("")
  const [action, setAction] = React.useState("")
  return (
    <section aria-label="Calendari dal pacchetto" style={{ minWidth: 0, display: "grid", gap: 24 }}>
      <form
        aria-label="Appuntamento dal calendario"
        style={{ minWidth: 0, display: "grid", gap: 16 }}
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))))
        }}
      >
        <DatePicker
          label="Calendario appuntamento"
          value={date}
          today={new Date(2026, 4, 11)}
          onConfirm={setDate}
          onCancel={() => setAction("Data annullata")}
        />
        <DatePickerField
          label="Data appuntamento"
          name="appointmentDate"
          value={nativeDate(date)}
          readOnly
        />
        <Button type="submit">Invia appuntamento</Button>
        <output aria-label="Appuntamento inviato">{submitted}</output>
      </form>
      <DatePicker
        mode="range"
        label="Calendario intervallo"
        value={range}
        today={new Date(2026, 4, 11)}
        onConfirm={setRange}
        onCancel={() => setAction("Intervallo annullato")}
      />
      <output aria-label="Intervallo dal calendario">
        {range ? JSON.stringify({ from: nativeDate(range.from), to: nativeDate(range.to) }) : ""}
      </output>
      <output aria-label="Azione calendario">{action}</output>
    </section>
  )
}

const productCover =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="272" height="191"><rect width="272" height="191" fill="white"/><circle cx="136" cy="95" r="64" fill="gray"/></svg>',
  )

function ConsumerChrome() {
  return (
    <section
      aria-label="Intestazioni dal pacchetto"
      style={{ minWidth: 0, display: "grid", gap: 16 }}
    >
      {/* The 320px column the source mobile variants are drawn in: the bands
          must stay one row each and the caller's actions must stay inside. */}
      {/* The two bands are full-bleed in the source frames (320 wide with the
          24px inset inside), so the column cancels the page padding of the
          consumer shell instead of shrinking with it. */}
      <div data-testid="consumer-chrome" style={{ maxWidth: 320, margin: "0 -16px", minWidth: 0 }}>
        <div data-testid="consumer-preheader">
          <Preheader
            institution="PagoPA S.p.A."
            links={[
              {
                label: "Manuale operativo",
                href: "#consumer-manuale",
                icon: <PagoPAIcon name="menu_book" />,
              },
              {
                label: "Assistenza",
                href: "#consumer-assistenza",
                icon: <PagoPAIcon name="support" />,
              },
            ]}
            actions={<Button>Accedi</Button>}
          />
        </div>
        <div data-testid="consumer-header">
          <Header
            product={{ label: "Nome del prodotto", href: "#consumer-prodotto" }}
            user={{
              name: "Comune di Roma",
              parent: "PagoPA S.p.A.",
              role: "Referente amministrativo",
              href: "#consumer-profilo",
              avatar: <Avatar alt="Comune di Roma" initials="CR" size="small" />,
            }}
            actions={<Button>Esci</Button>}
          />
        </div>
        <Footer
          links={[
            { label: "Informativa Privacy", href: "#consumer-privacy" },
            { label: "Termini e Condizioni", href: "#consumer-termini" },
          ]}
        />
      </div>
    </section>
  )
}

function ConsumerProducts() {
  const [actions, setActions] = React.useState(0)
  const [submitted, setSubmitted] = React.useState(false)
  return (
    <section
      aria-label="Schede prodotto dal pacchetto"
      style={{ minWidth: 0, display: "grid", gap: 16 }}
    >
      <form
        aria-label="Azioni del prodotto"
        style={{ width: 272, maxWidth: "100%", display: "grid", gap: 16 }}
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(true)
        }}
      >
        <ProductCard
          data-testid="consumer-product"
          title="Portale dei servizi"
          titleAs="h2"
          logo={
            <PagoPAIcon
              name="IO logo"
              variant="dark"
              size={48}
              decorative={false}
              label="Logo del portale"
            />
          }
          chip={
            <Chip size="compact" variant="highlight">
              Premium
            </Chip>
          }
          description={
            <>
              Richiedi l'accesso agli{" "}
              <a
                href="#consumer-product-admins"
                style={{ color: "var(--primary)", textDecoration: "underline" }}
              >
                Amministratori del prodotto
              </a>
              .
            </>
          }
          href="#consumer-product-destination"
          actionLabel="Vai al prodotto"
        />
        <ProductCard
          data-testid="consumer-image-product"
          title="Documenti digitali"
          titleAs="h2"
          logo={
            <PagoPAIcon
              name="IO logo"
              variant="dark"
              size={48}
              decorative={false}
              label="Logo del prodotto digitale"
            />
          }
          image={<Image src={productCover} alt="Anteprima del prodotto digitale" />}
          description="Invia e consulta i documenti del tuo ente."
          actionLabel="Aderisci"
          onAction={() => setActions((count) => count + 1)}
        />
        <ProductCard
          data-testid="consumer-inert-product"
          title="Servizio informativo"
          description="Questa scheda non contiene azioni."
          actionLabel="Non mostrare un'azione senza destinazione"
        />
        <div style={{ width: 240, maxWidth: "100%", display: "grid" }}>
          <ProductCard
            data-testid="consumer-narrow-product"
            title="GestioneDocumentalePerLeAmministrazioniPubbliche"
            logo={
              <PagoPAIcon
                name="IO logo"
                variant="dark"
                size={48}
                decorative={false}
                label="Logo del servizio documentale"
              />
            }
            chip={
              <Chip size="compact" variant="highlight">
                Servizio amministrativo avanzato
              </Chip>
            }
            href="#consumer-product-destination"
            actionLabel="Richiedi l'accesso alla gestione amministrativa del prodotto"
          />
        </div>
        <output aria-label="Azione prodotto">{actions}</output>
        <output aria-label="Invio prodotti">{submitted ? "Inviato" : "Non inviato"}</output>
      </form>
      <h2 id="consumer-product-admins">Amministratori</h2>
      <h2 id="consumer-product-destination">Prodotto dal collegamento</h2>
    </section>
  )
}

function ConsumerSwitches() {
  const [loading, setLoading] = React.useState(false)
  const [submitted, setSubmitted] = React.useState("")
  return (
    <section
      aria-label="Switch dal pacchetto"
      style={{ minWidth: 0, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 }}
    >
      <form
        aria-label="Impostazioni degli aggiornamenti"
        style={{ minWidth: 0, display: "grid", gap: 16 }}
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))))
        }}
      >
        <SwitchField
          label="Aggiornamenti della pratica"
          name="sourceUpdates"
          defaultChecked
          loading={loading}
          leadingIcon={<PagoPAIcon name="mobile_2" />}
          description="Ricevi una comunicazione quando cambia lo stato."
          learnMore={{ label: "Scopri gli aggiornamenti", href: "#consumer-switch-info" }}
        />
        <SwitchField
          label="Avvisi non modificabili"
          name="lockedUpdates"
          defaultChecked
          disabled
          description="Questa preferenza non può essere modificata."
          learnMore={{ label: "Informazioni sugli avvisi", href: "#consumer-switch-locked-info" }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Switch size="sm" name="compactUpdates" />
          Preferenza compatta
        </label>
        <Button type="button" onClick={() => setLoading((current) => !current)}>
          {loading ? "Completa aggiornamento preferenza" : "Aggiorna preferenza"}
        </Button>
        <Button type="submit">Invia impostazioni</Button>
        <Button type="reset" variant="outline">
          Ripristina impostazioni
        </Button>
        <output aria-label="Impostazioni inviate">{submitted}</output>
      </form>
      <section
        aria-label="Preferenza nel layout da 240 px"
        style={{ width: 240, maxWidth: "100%", display: "grid" }}
      >
        <SwitchField
          label="AggiornamentiDellePratichePerLePubblicheAmministrazioni"
          defaultChecked
          leadingIcon={<PagoPAIcon name="mobile_2" />}
          description="ComunicazioniRelativeAgliAggiornamentiDeiServiziDellaPubblicaAmministrazione"
          learnMore={{
            label: "InformazioniSugliAggiornamentiDellePraticheAmministrative",
            href: "#consumer-switch-info",
          }}
        />
      </section>
      <section
        aria-label="Preferenza con indicatore iniziale"
        style={{ width: 320, maxWidth: "100%", display: "grid" }}
      >
        <SwitchField
          label="Comunicazioni del servizio"
          indicatorPlacement="start"
          description="Ricevi gli aggiornamenti della pratica."
        />
      </section>
      <h2 id="consumer-switch-info">Informazioni sugli aggiornamenti</h2>
      <h2 id="consumer-switch-locked-info">Informazioni sugli avvisi non modificabili</h2>
    </section>
  )
}

function ConsumerFocusControls() {
  const [optionalVisible, setOptionalVisible] = React.useState(true)
  const [schoolVisible, setSchoolVisible] = React.useState(true)
  return (
    <section aria-label="Controlli di tastiera" style={{ minWidth: 0, display: "grid", gap: 16 }}>
      <TextareaField label="Note della preferenza" />
      <DatePickerField label="Data della preferenza" defaultValue="2026-05-11" />
      {schoolVisible ? (
        <InputChip onRemove={() => setSchoolVisible(false)}>Servizi scolastici</InputChip>
      ) : null}
      {optionalVisible ? (
        <Chip onRemove={() => setOptionalVisible(false)}>Servizio facoltativo</Chip>
      ) : null}
    </section>
  )
}

function ConsumerResponsiveScopes() {
  const [moduleActions, setModuleActions] = React.useState(0)
  const [segment, setSegment] = React.useState("attivi")
  return (
    <section
      aria-label="Composizioni reattive dal pacchetto"
      style={{ minWidth: 0, display: "grid", gap: 24 }}
    >
      {/* The list is its own scroll area: wider than this column at 320 it must
          fall back to the start, or the centred overflow hides the first tab
          off the unreachable left edge. */}
      <div
        data-testid="consumer-scrollable-tabs"
        style={{ width: 240, maxWidth: "100%", minWidth: 0 }}
      >
        <Tabs defaultValue="attivi">
          <TabsList
            variant="line"
            aria-label="Sezioni del servizio"
            className="w-full overflow-x-auto"
          >
            <TabsTrigger value="attivi">Attivi</TabsTrigger>
            <TabsTrigger value="archiviati">Archiviati</TabsTrigger>
            <TabsTrigger value="tutti">Tutti</TabsTrigger>
          </TabsList>
          <TabsContent value="attivi">Pratiche in lavorazione.</TabsContent>
          <TabsContent value="archiviati">Pratiche concluse.</TabsContent>
          <TabsContent value="tutti">Tutte le pratiche del servizio.</TabsContent>
        </Tabs>
      </div>
      {/* The source segments need more than a 320 viewport column can give at
          the 24px inset; the control must absorb the squeeze without painting
          outside its column or truncating a label. */}
      <div data-testid="consumer-segmented" style={{ minWidth: 0 }}>
        <SegmentedControl
          items={[
            { value: "attivi", label: "Attivi" },
            { value: "archiviati", label: "Archiviati" },
            { value: "tutti", label: "Tutti" },
          ]}
          value={segment}
          onValueChange={(value) => setSegment(value)}
          aria-label="Filtro stato"
        />
      </div>
      {/* A container-scoped module in the source's own mobile column: the page
          stays wide and the module still renders its stacked composition. */}
      <div
        data-testid="consumer-narrow-module"
        style={{ width: 272, maxWidth: "100%", minWidth: 0 }}
      >
        <CheckoutModule
          title="Dati del pagamento"
          description="Paga con l'app IO o con la tua carta."
          suggestion="Suggerito perché sei già cliente"
          actionLabel="Modifica"
          onAction={() => setModuleActions((count) => count + 1)}
        />
      </div>
      <output aria-label="Azioni del modulo">{moduleActions}</output>
    </section>
  )
}

function Consumer() {
  const [activations, setActivations] = React.useState(0)
  const [submitted, setSubmitted] = React.useState("")
  const [menuAction, setMenuAction] = React.useState("")
  return (
    <main style={{ maxWidth: 512, margin: "0 auto", padding: 16, display: "grid", gap: 24 }}>
      <h1>Consumo del pacchetto</h1>
      <Button onClick={() => setActivations((count) => count + 1)}>Attiva azione</Button>
      <output aria-label="Attivazioni">{activations}</output>
      <section
        id="consumer-breadcrumb-home"
        aria-label="Percorsi dal pacchetto"
        style={{ minWidth: 0, display: "grid", gap: 16 }}
      >
        <Breadcrumb
          aria-label="Percorso del servizio"
          items={[
            { label: "Home del comune", href: "#consumer-breadcrumb-home" },
            { label: "Servizi del comune", href: "#consumer-breadcrumb-parent" },
            { label: "Archivio senza destinazione" },
            { label: "Calendari del servizio" },
          ]}
        />
        <Breadcrumb
          aria-label="Ritorno dal servizio"
          layout="compact"
          back={{ label: "Torna ai servizi del comune", href: "#consumer-breadcrumb-parent" }}
        />
        <h2 id="consumer-breadcrumb-parent">Servizi comunali</h2>
      </section>
      <ConsumerProducts />
      <section
        aria-label="Indicatori di caricamento dal pacchetto"
        style={{ display: "grid", gap: 8 }}
      >
        <div data-testid="consumer-spinner-status-region" aria-busy="true">
          <Spinner label="Caricamento dati dal pacchetto" />
        </div>
        <div
          data-testid="consumer-spinner-contrast-surface"
          style={{ width: "fit-content", backgroundColor: "var(--primary)", padding: 8 }}
        >
          <Spinner variant="contrast" />
        </div>
      </section>
      <ConsumerSwitches />
      <ConsumerFocusControls />
      <ConsumerAuthentication />
      <ConsumerAvatars />
      <form
        aria-label="Dati del comune"
        style={{ display: "grid", gap: 24 }}
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))))
        }}
      >
        <Autocomplete
          label="Comune"
          name="city"
          defaultValue="roma"
          options={consumerCityOptions}
          required
        />
        <SelectField
          label="Provincia"
          name="province"
          defaultValue="rm"
          options={[
            { ...consumerCityOptions[0], value: "rm" },
            { ...consumerCityOptions[1], value: "mi" },
          ]}
          required
        />
        <Button type="submit">Invia dati</Button>
      </form>
      <output aria-label="Dati inviati" style={{ overflowWrap: "anywhere" }}>
        {submitted}
      </output>
      <Dialog
        trigger={
          <Button id="consumer-dialog-trigger" variant="outline">
            Apri dialogo
          </Button>
        }
        title="Conferma azione"
        description="Dialogo dal pacchetto installato."
      >
        <Button>Conferma</Button>
      </Dialog>
      <Drawer
        trigger={
          <Button id="consumer-drawer-trigger" variant="outline">
            Apri pannello
          </Button>
        }
        title="Preferenze del pannello"
        description="Pannello modale dal pacchetto installato."
        direction="bottom"
      >
        <Button>Aggiorna pannello</Button>
      </Drawer>
      <Popover
        trigger={
          <Button id="consumer-popover-trigger" variant="outline">
            Apri dettagli
          </Button>
        }
      >
        <Button id="consumer-popover-action">Azione contestuale</Button>
      </Popover>
      <output aria-label="Azione del menu">{menuAction}</output>
      <ConsumerPreferences />
      <ConsumerCalendars />
      <PagoPAIcon name="info" decorative={false} label="Informazioni" />
      <PagoPAPictogram name="Hourglass" background="light" />
      <div style={{ background: "var(--navy)", padding: 16 }}>
        <PagoPAPictogram name="Hourglass" background="dark" />
      </div>
      <section
        aria-label="Icone locali"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
          color: "var(--primary)",
        }}
      >
        {iconCases.map(({ name, variant }) => (
          <div
            key={`${name}-${variant ?? "default"}`}
            style={
              name === "IO logo" && variant === "light"
                ? { background: "var(--navy)", padding: 8, forcedColorAdjust: "none" }
                : undefined
            }
          >
            <PagoPAIcon
              name={name}
              variant={variant}
              decorative={false}
              label={`${name} ${variant ?? "default"}`}
            />
          </div>
        ))}
      </section>
      <ConsumerChrome />
      <ConsumerResponsiveScopes />
      <ConsumerTable onMenuAction={setMenuAction} />
      <ConsumerChoiceAction />
    </main>
  )
}

const container = document.getElementById("root")
if (!container) throw new Error("Missing consumer root")
createRoot(container).render(<Consumer />)
