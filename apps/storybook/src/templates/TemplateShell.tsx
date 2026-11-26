"use client"

import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Home,
  LayoutDashboard,
  Menu,
  Search,
  UserRound,
} from "lucide-react"
import { cn } from "@/lib/cn"

import { FeatureList, ListItem, StatusTile, Tag } from "@/components/content"
import { ProgressKpi, TableList, Timeline } from "@/components/data-display"
import { InputChip } from "@/components/inputs"
import { Button } from "@/components/primitives/button"
import { Input } from "@/components/primitives/input"
import { Progress } from "@/components/primitives/progress"

export type TemplateKind =
  | "landing"
  | "dashboard"
  | "form"
  | "wizard"
  | "auth"
  | "list"
  | "detail"
  | "drawer"
  | "recap"
  | "legal"
  | "email"
  | "feedback"

export interface TemplateConfig {
  name: string
  kind: TemplateKind
  eyebrow?: string
  title: string
  description: string
  primaryAction?: string
  secondaryAction?: string
}

export interface TemplateProps {
  className?: string
  config?: Partial<TemplateConfig>
}

function Brand() {
  return (
    <a
      href="#main-content"
      className="pui:flex pui:items-center pui:gap-2 pui:text-body-sb pui:text-primary pui:focus-visible:outline-2"
    >
      <span className="pui:grid pui:size-8 pui:place-items-center pui:rounded-full pui:bg-primary pui:text-label-mini pui:text-primary-foreground">
        p
      </span>
      pagoPA
    </a>
  )
}

function AppHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className="pui:border-b pui:bg-background">
      <div className="pui:mx-auto pui:flex pui:min-h-16 pui:max-w-7xl pui:items-center pui:gap-4 pui:px-4 pui:tablet:px-6 pui:desktop:px-8">
        <Brand />
        {!compact ? (
          <nav
            aria-label="Navigazione principale"
            className="pui:ml-auto pui:hidden pui:items-center pui:gap-1 pui:tablet-md:flex"
          >
            <Button variant="ghost">
              <Home aria-hidden="true" />
              Home
            </Button>
            <Button variant="ghost">
              <LayoutDashboard aria-hidden="true" />
              Servizi
            </Button>
          </nav>
        ) : null}
        <div className="pui:ml-auto pui:flex pui:items-center pui:gap-1 pui:tablet-md:ml-0">
          <Button variant="ghost" size="icon" aria-label="Notifiche">
            <Bell aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Profilo">
            <UserRound aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Menu" className="pui:tablet-md:hidden">
            <Menu aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  )
}

function Actions({ config }: { config: TemplateConfig }) {
  return (
    <div className="pui:flex pui:flex-wrap pui:gap-3">
      {config.primaryAction ? (
        <Button>
          {config.primaryAction}
          <ArrowRight aria-hidden="true" />
        </Button>
      ) : null}
      {config.secondaryAction ? <Button variant="outline">{config.secondaryAction}</Button> : null}
    </div>
  )
}

function LandingBody({ config }: { config: TemplateConfig }) {
  return (
    <>
      <section className="pui:grid pui:items-center pui:gap-8 pui:py-8 pui:tablet-md:grid-cols-2 pui:tablet-md:py-16">
        <div>
          <InputChip>{config.eyebrow || "Servizi pubblici digitali"}</InputChip>
          <h1 className="pui:mt-5 pui:text-title-lg pui:tablet:text-title-xxl">{config.title}</h1>
          <p className="pui:mt-4 pui:max-w-xl pui:text-body pui:text-muted-foreground">
            {config.description}
          </p>
          <div className="pui:mt-6">
            <Actions config={config} />
          </div>
        </div>
        <div className="pui:min-h-72 pui:rounded-3xl pui:bg-gradient-to-br pui:from-primary pui:to-brand-cyan pui:p-8 pui:text-primary-foreground">
          <p className="pui:text-label-mini-sb pui:uppercase">In evidenza</p>
          <p className="pui:mt-20 pui:text-title-sm">Semplice, sicuro, accessibile.</p>
        </div>
      </section>
      <FeatureList
        titleAs="h2"
        features={[
          {
            title: "Pagamenti sicuri",
            description: "Paga online verso la Pubblica Amministrazione.",
            icon: <CheckCircle2 />,
          },
          {
            title: "Servizi accessibili",
            description: "Esperienze progettate per tutte le persone.",
            icon: <CheckCircle2 />,
          },
          {
            title: "Dati sotto controllo",
            description: "Consulta ricevute e stato delle operazioni.",
            icon: <CheckCircle2 />,
          },
        ]}
        className="pui:py-8 pui:tablet-md:grid-cols-3"
      />
    </>
  )
}

function DashboardBody({ config }: { config: TemplateConfig }) {
  return (
    <>
      <div className="pui:flex pui:flex-wrap pui:items-end pui:justify-between pui:gap-4">
        <div>
          <p className="pui:text-label-sb pui:text-primary">{config.eyebrow}</p>
          <h1 className="pui:text-title-sm">{config.title}</h1>
          <p className="pui:text-muted-foreground">{config.description}</p>
        </div>
        <Actions config={config} />
      </div>
      <div className="pui:grid pui:gap-4 pui:tablet:grid-cols-2 pui:desktop:grid-cols-3">
        <ProgressKpi label="Pagamenti completati" value={84} detail="Ultimi 30 giorni" />
        <ProgressKpi label="Servizi attivi" value={12} total={16} />
        <ProgressKpi label="Richieste gestite" value={236} total={300} />
      </div>
      <div className="pui:grid pui:gap-6 pui:desktop:grid-cols-[1fr_var(--pui-grid-aside)]">
        <TableList
          label="Attività recenti"
          rows={[
            { id: 1, name: "Pagamento TARI", meta: "Completato oggi" },
            { id: 2, name: "Bonus trasporti", meta: "In lavorazione" },
          ]}
          fields={(row) => [{ label: row.meta, value: row.name }]}
          action={(row) => ({ label: "Apri", href: `/attivita/${row.id}` })}
        />
        <StatusTile title="Tutto funziona correttamente" tag={<Tag status="success">Attivo</Tag>}>
          Ultimo aggiornamento pochi secondi fa.
        </StatusTile>
      </div>
    </>
  )
}

function FormBody({ config, wizard = false }: { config: TemplateConfig; wizard?: boolean }) {
  return (
    <div className="pui:mx-auto pui:max-w-3xl">
      {wizard ? (
        <div className="pui:mb-6">
          <div className="pui:flex pui:justify-between pui:text-label-mini">
            <span>Passaggio 2 di 4</span>
            <span>50%</span>
          </div>
          <Progress
            value={50}
            aria-label="Avanzamento del modulo: 50%"
            className="pui:mt-2 pui:h-2"
          />
        </div>
      ) : null}
      <p className="pui:text-label-sb pui:text-primary">{config.eyebrow}</p>
      <h1 className="pui:text-title-sm">{config.title}</h1>
      <p className="pui:mt-2 pui:text-muted-foreground">{config.description}</p>
      <form className="pui:mt-8 pui:space-y-6" onSubmit={(event) => event.preventDefault()}>
        <label className="pui:grid pui:gap-2 pui:text-label-sb">
          Nome e cognome
          <Input name="name" autoComplete="name" placeholder="Mario Rossi" />
        </label>
        <label className="pui:grid pui:gap-2 pui:text-label-sb">
          Email
          <Input name="email" type="email" autoComplete="email" placeholder="nome@esempio.it" />
        </label>
        <fieldset className="pui:rounded-xl pui:border pui:p-4">
          <legend className="pui:px-2 pui:text-label-sb">Preferenze</legend>
          <label className="pui:flex pui:min-h-11 pui:items-center pui:gap-3">
            <input type="checkbox" className="pui:size-5" /> Ricevi aggiornamenti sul servizio
          </label>
        </fieldset>
        <Actions config={config} />
      </form>
    </div>
  )
}

function AuthBody({ config }: { config: TemplateConfig }) {
  return (
    <div className="pui:mx-auto pui:grid pui:max-w-5xl pui:overflow-hidden pui:rounded-2xl pui:border pui:bg-card pui:shadow-sm pui:tablet-md:grid-cols-2">
      <div className="pui:bg-primary pui:p-8 pui:text-primary-foreground pui:tablet-md:p-12">
        <Brand />
        <h1 className="pui:mt-16 pui:text-title-lg">{config.title}</h1>
        <p className="pui:mt-4 pui:text-primary-foreground/85">{config.description}</p>
      </div>
      <form
        className="pui:space-y-5 pui:p-8 pui:tablet-md:p-12"
        onSubmit={(event) => event.preventDefault()}
      >
        <h2 className="pui:text-title-xs">Accedi al servizio</h2>
        <label className="pui:grid pui:gap-2 pui:text-label-sb">
          Email
          <Input type="email" autoComplete="email" />
        </label>
        <label className="pui:grid pui:gap-2 pui:text-label-sb">
          Password
          <Input type="password" autoComplete="current-password" />
        </label>
        <Button className="pui:w-full">Accedi</Button>
        <Button variant="outline" className="pui:w-full">
          Entra con SPID
        </Button>
      </form>
    </div>
  )
}

function ListBody({ config, table = false }: { config: TemplateConfig; table?: boolean }) {
  const rows = [
    { id: 1, name: "Pagamento imposta comunale", meta: "Aggiornato oggi", state: "Completato" },
    { id: 2, name: "Richiesta agevolazione", meta: "Aggiornato ieri", state: "In lavorazione" },
    { id: 3, name: "Iscrizione servizio", meta: "2 ottobre 2026", state: "Bozza" },
  ]
  return (
    <>
      <div className="pui:flex pui:flex-wrap pui:items-end pui:justify-between pui:gap-4">
        <div>
          <h1 className="pui:text-title-sm">{config.title}</h1>
          <p className="pui:text-muted-foreground">{config.description}</p>
        </div>
        <Actions config={config} />
      </div>
      <label className="pui:relative pui:block pui:max-w-xl">
        <span className="pui:sr-only">Cerca</span>
        <Search
          aria-hidden="true"
          className="pui:absolute pui:top-3 pui:left-3 pui:size-5 pui:text-muted-foreground"
        />
        <Input className="pui:pl-10" placeholder="Cerca per nome o identificativo" type="search" />
      </label>
      {table ? (
        <div className="pui:overflow-hidden pui:rounded-xl pui:border">
          <div className="pui:hidden pui:grid-cols-[1fr_var(--pui-grid-fields)_var(--pui-grid-actions)] pui:gap-4 pui:bg-muted pui:p-4 pui:text-label-sb pui:tablet:grid">
            <span>Elemento</span>
            <span>Stato</span>
            <span />
          </div>
          {rows.map((row) => (
            <ListItem
              key={row.id}
              description={row.meta}
              value={row.name}
              chip={<InputChip>{row.state}</InputChip>}
              chevron
            />
          ))}
        </div>
      ) : (
        <TableList
          label={config.title}
          rows={rows}
          fields={(row) => [
            { label: row.meta, value: row.name },
            {
              label: "Stato",
              value: <InputChip>{row.state}</InputChip>,
            },
          ]}
          action={(row) => ({ label: "Apri", href: `/elementi/${row.id}` })}
        />
      )}
    </>
  )
}

function DetailBody({ config }: { config: TemplateConfig }) {
  return (
    <div className="pui:grid pui:gap-8 pui:desktop:grid-cols-[1fr_var(--pui-grid-aside)]">
      <article>
        <p className="pui:text-label-sb pui:text-primary">{config.eyebrow}</p>
        <h1 className="pui:text-title-lg">{config.title}</h1>
        <p className="pui:mt-3 pui:text-body pui:text-muted-foreground">{config.description}</p>
        <div className="pui:mt-8 pui:rounded-xl pui:border pui:p-6">
          <h2 className="pui:text-h4">Dettagli</h2>
          <dl className="pui:mt-4 pui:grid pui:gap-4 pui:tablet:grid-cols-2">
            <div>
              <dt className="pui:text-label-mini pui:text-muted-foreground">Identificativo</dt>
              <dd className="pui:text-body-sb">PPA-2026-00421</dd>
            </div>
            <div>
              <dt className="pui:text-label-mini pui:text-muted-foreground">Stato</dt>
              <dd>
                <Tag status="success">Attivo</Tag>
              </dd>
            </div>
          </dl>
        </div>
        <div className="pui:mt-8">
          <Timeline
            items={[
              { id: 1, title: "Richiesta inviata", dot: "outlined" },
              { id: 2, title: "Verifica in corso", dot: "filled" },
              { id: 3, title: "Completamento", dot: "small" },
            ]}
          />
        </div>
      </article>
      <aside aria-label="Azioni" className="pui:h-fit pui:rounded-xl pui:border pui:p-5">
        <h2 className="pui:text-label-sb">Azioni disponibili</h2>
        <div className="pui:mt-4">
          <Actions config={config} />
        </div>
      </aside>
    </div>
  )
}

function DrawerBody({ config }: { config: TemplateConfig }) {
  return (
    <div className="pui:relative pui:min-h-128 pui:overflow-hidden pui:rounded-xl pui:border pui:bg-muted">
      <div className="pui:p-8 pui:opacity-60">
        <h1 className="pui:text-title-sm">Contenuto della pagina</h1>
        <p className="pui:mt-2">Il pannello mantiene visibile il contesto sottostante.</p>
      </div>
      <aside
        aria-label={config.title}
        className="pui:absolute pui:inset-y-0 pui:right-0 pui:flex pui:w-(--pui-drawer-width) pui:max-w-[88%] pui:flex-col pui:bg-background pui:shadow-xl"
      >
        <header className="pui:border-b pui:p-6">
          <p className="pui:text-label-mini-sb pui:text-primary">{config.eyebrow}</p>
          <h1 className="pui:text-title-xs">{config.title}</h1>
          <p className="pui:text-muted-foreground">{config.description}</p>
        </header>
        <div className="pui:flex-1 pui:space-y-4 pui:overflow-auto pui:p-6">
          <ListItem value="Prima opzione" chevron />
          <ListItem value="Seconda opzione" chevron />
          <ListItem value="Terza opzione" chevron />
        </div>
        <footer className="pui:border-t pui:p-6">
          <Actions config={config} />
        </footer>
      </aside>
    </div>
  )
}

function RecapBody({ config }: { config: TemplateConfig }) {
  return (
    <div className="pui:mx-auto pui:max-w-3xl">
      <CheckCircle2 aria-hidden="true" className="pui:size-14 pui:text-success" />
      <h1 className="pui:mt-4 pui:text-title-lg">{config.title}</h1>
      <p className="pui:mt-2 pui:text-body pui:text-muted-foreground">{config.description}</p>
      <dl className="pui:my-8 pui:rounded-xl pui:border">
        {[
          ["Servizio", "Pagamento spontaneo"],
          ["Importo", "€ 42,00"],
          ["Identificativo", "PPA-2026-00421"],
        ].map(([term, value]) => (
          <div
            key={term}
            className="pui:grid pui:grid-cols-2 pui:gap-4 pui:border-b pui:p-4 pui:last:border-0"
          >
            <dt className="pui:text-muted-foreground">{term}</dt>
            <dd className="pui:text-right pui:text-body-sb">{value}</dd>
          </div>
        ))}
      </dl>
      <Actions config={config} />
    </div>
  )
}

function LegalBody({ config }: { config: TemplateConfig }) {
  return (
    <article className="pui:mx-auto pui:max-w-3xl">
      <p className="pui:text-label-mini-sb pui:text-primary">
        Ultimo aggiornamento: 5 ottobre 2026
      </p>
      <h1 className="pui:mt-2 pui:text-title-lg">{config.title}</h1>
      <p className="pui:mt-4 pui:text-body pui:text-muted-foreground">{config.description}</p>
      {["Ambito di applicazione", "Trattamento dei dati", "Diritti delle persone", "Contatti"].map(
        (heading) => (
          <section key={heading} className="pui:mt-8">
            <h2 className="pui:text-title-xs">{heading}</h2>
            <p className="pui:mt-2 pui:leading-7">
              Questa sezione descrive in modo chiaro le condizioni applicabili e le modalità con cui
              il servizio tutela dati, diritti e trasparenza.
            </p>
          </section>
        ),
      )}
    </article>
  )
}

function EmailBody({ config }: { config: TemplateConfig }) {
  return (
    <div className="pui:mx-auto pui:max-w-2xl pui:rounded-xl pui:border pui:bg-background pui:shadow-sm">
      <div className="pui:border-b pui:p-6">
        <Brand />
      </div>
      <div className="pui:p-6 pui:tablet:p-10">
        <p className="pui:text-label-mini-sb pui:text-primary">{config.eyebrow}</p>
        <h1 className="pui:mt-2 pui:text-title-sm">{config.title}</h1>
        <p className="pui:mt-4 pui:text-body">{config.description}</p>
        <div className="pui:mt-8">
          <Actions config={config} />
        </div>
      </div>
      <div className="pui:bg-muted pui:p-6 pui:text-label-mini pui:text-muted-foreground">
        Messaggio automatico di pagoPA · Non rispondere a questa email.
      </div>
    </div>
  )
}

function FeedbackBody({ config }: { config: TemplateConfig }) {
  return (
    <div className="pui:mx-auto pui:max-w-2xl pui:text-center">
      <span className="pui:mx-auto pui:grid pui:size-20 pui:place-items-center pui:rounded-full pui:bg-success-soft pui:text-success">
        <CheckCircle2 aria-hidden="true" className="pui:size-11" />
      </span>
      <h1 className="pui:mt-6 pui:text-title-lg">{config.title}</h1>
      <p className="pui:mt-3 pui:text-body pui:text-muted-foreground">{config.description}</p>
      <div className="pui:mt-8 pui:flex pui:justify-center">
        <Actions config={config} />
      </div>
    </div>
  )
}

export function TemplateShell({
  config,
  className,
}: {
  config: TemplateConfig
  className?: string
}) {
  const standalone = config.kind === "auth" || config.kind === "email"
  return (
    <div className={cn("pui:min-h-152 pui:bg-background pui:text-foreground", className)}>
      <a
        href="#main-content"
        className="pui:fixed pui:top-2 pui:left-2 pui:z-[100] pui:-translate-y-20 pui:rounded pui:bg-primary pui:px-4 pui:py-2 pui:text-primary-foreground pui:focus:translate-y-0"
      >
        Vai al contenuto
      </a>
      {!standalone ? <AppHeader compact={config.kind === "drawer"} /> : null}
      <main
        id="main-content"
        className={cn(
          "pui:mx-auto pui:max-w-7xl pui:space-y-8 pui:px-4 pui:py-8 pui:tablet:px-6 pui:desktop:px-8",
          standalone && "pui:py-10",
        )}
      >
        {config.kind === "landing" ? <LandingBody config={config} /> : null}
        {config.kind === "dashboard" ? <DashboardBody config={config} /> : null}
        {config.kind === "form" ? <FormBody config={config} /> : null}
        {config.kind === "wizard" ? <FormBody config={config} wizard /> : null}
        {config.kind === "auth" ? <AuthBody config={config} /> : null}
        {config.kind === "list" ? (
          <ListBody config={config} table={config.name === "TableListView"} />
        ) : null}
        {config.kind === "detail" ? <DetailBody config={config} /> : null}
        {config.kind === "drawer" ? <DrawerBody config={config} /> : null}
        {config.kind === "recap" ? <RecapBody config={config} /> : null}
        {config.kind === "legal" ? <LegalBody config={config} /> : null}
        {config.kind === "email" ? <EmailBody config={config} /> : null}
        {config.kind === "feedback" ? <FeedbackBody config={config} /> : null}
      </main>
      {!standalone ? (
        <footer className="pui:mt-10 pui:border-t pui:bg-muted">
          <div className="pui:mx-auto pui:flex pui:max-w-7xl pui:flex-wrap pui:justify-between pui:gap-4 pui:px-4 pui:py-8 pui:tablet:px-6 pui:desktop:px-8">
            <Brand />
            <p className="pui:text-label-mini pui:text-muted-foreground">© 2026 PagoPA S.p.A.</p>
          </div>
        </footer>
      ) : null}
    </div>
  )
}
