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
      className="flex items-center gap-2 text-body-sb text-primary focus-visible:outline-2"
    >
      <span className="grid size-8 place-items-center rounded-full bg-primary text-label-mini text-primary-foreground">
        p
      </span>
      pagoPA
    </a>
  )
}

function AppHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Brand />
        {!compact ? (
          <nav
            aria-label="Navigazione principale"
            className="ml-auto hidden items-center gap-1 md:flex"
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
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Button variant="ghost" size="icon" aria-label="Notifiche">
            <Bell aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Profilo">
            <UserRound aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Menu" className="md:hidden">
            <Menu aria-hidden="true" />
          </Button>
        </div>
      </div>
    </header>
  )
}

function Actions({ config }: { config: TemplateConfig }) {
  return (
    <div className="flex flex-wrap gap-3">
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
      <section className="grid items-center gap-8 py-8 md:grid-cols-2 md:py-16">
        <div>
          <InputChip>{config.eyebrow || "Servizi pubblici digitali"}</InputChip>
          <h1 className="mt-5 text-title-lg sm:text-title-xxl">{config.title}</h1>
          <p className="mt-4 max-w-xl text-body text-muted-foreground">{config.description}</p>
          <div className="mt-6">
            <Actions config={config} />
          </div>
        </div>
        <div className="min-h-72 rounded-3xl bg-gradient-to-br from-primary to-brand-cyan p-8 text-primary-foreground">
          <p className="text-label-mini-sb uppercase">In evidenza</p>
          <p className="mt-20 text-title-sm">Semplice, sicuro, accessibile.</p>
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
        className="py-8 md:grid-cols-3"
      />
    </>
  )
}

function DashboardBody({ config }: { config: TemplateConfig }) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-label-sb text-primary">{config.eyebrow}</p>
          <h1 className="text-title-sm">{config.title}</h1>
          <p className="text-muted-foreground">{config.description}</p>
        </div>
        <Actions config={config} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ProgressKpi label="Pagamenti completati" value={84} detail="Ultimi 30 giorni" />
        <ProgressKpi label="Servizi attivi" value={12} total={16} />
        <ProgressKpi label="Richieste gestite" value={236} total={300} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_var(--grid-aside)]">
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
    <div className="mx-auto max-w-3xl">
      {wizard ? (
        <div className="mb-6">
          <div className="flex justify-between text-label-mini">
            <span>Passaggio 2 di 4</span>
            <span>50%</span>
          </div>
          <Progress value={50} aria-label="Avanzamento del modulo: 50%" className="mt-2 h-2" />
        </div>
      ) : null}
      <p className="text-label-sb text-primary">{config.eyebrow}</p>
      <h1 className="text-title-sm">{config.title}</h1>
      <p className="mt-2 text-muted-foreground">{config.description}</p>
      <form className="mt-8 space-y-6" onSubmit={(event) => event.preventDefault()}>
        <label className="grid gap-2 text-label-sb">
          Nome e cognome
          <Input name="name" autoComplete="name" placeholder="Mario Rossi" />
        </label>
        <label className="grid gap-2 text-label-sb">
          Email
          <Input name="email" type="email" autoComplete="email" placeholder="nome@esempio.it" />
        </label>
        <fieldset className="rounded-xl border p-4">
          <legend className="px-2 text-label-sb">Preferenze</legend>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" className="size-5" /> Ricevi aggiornamenti sul servizio
          </label>
        </fieldset>
        <Actions config={config} />
      </form>
    </div>
  )
}

function AuthBody({ config }: { config: TemplateConfig }) {
  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-sm md:grid-cols-2">
      <div className="bg-primary p-8 text-primary-foreground md:p-12">
        <Brand />
        <h1 className="mt-16 text-title-lg">{config.title}</h1>
        <p className="mt-4 text-primary-foreground/85">{config.description}</p>
      </div>
      <form className="space-y-5 p-8 md:p-12" onSubmit={(event) => event.preventDefault()}>
        <h2 className="text-title-xs">Accedi al servizio</h2>
        <label className="grid gap-2 text-label-sb">
          Email
          <Input type="email" autoComplete="email" />
        </label>
        <label className="grid gap-2 text-label-sb">
          Password
          <Input type="password" autoComplete="current-password" />
        </label>
        <Button className="w-full">Accedi</Button>
        <Button variant="outline" className="w-full">
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-title-sm">{config.title}</h1>
          <p className="text-muted-foreground">{config.description}</p>
        </div>
        <Actions config={config} />
      </div>
      <label className="relative block max-w-xl">
        <span className="sr-only">Cerca</span>
        <Search aria-hidden="true" className="absolute top-3 left-3 size-5 text-muted-foreground" />
        <Input className="pl-10" placeholder="Cerca per nome o identificativo" type="search" />
      </label>
      {table ? (
        <div className="overflow-hidden rounded-xl border">
          <div className="hidden grid-cols-[1fr_var(--grid-fields)_var(--grid-actions)] gap-4 bg-muted p-4 text-label-sb sm:grid">
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
    <div className="grid gap-8 lg:grid-cols-[1fr_var(--grid-aside)]">
      <article>
        <p className="text-label-sb text-primary">{config.eyebrow}</p>
        <h1 className="text-title-lg">{config.title}</h1>
        <p className="mt-3 text-body text-muted-foreground">{config.description}</p>
        <div className="mt-8 rounded-xl border p-6">
          <h2 className="text-h4">Dettagli</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-label-mini text-muted-foreground">Identificativo</dt>
              <dd className="text-body-sb">PPA-2026-00421</dd>
            </div>
            <div>
              <dt className="text-label-mini text-muted-foreground">Stato</dt>
              <dd>
                <Tag status="success">Attivo</Tag>
              </dd>
            </div>
          </dl>
        </div>
        <div className="mt-8">
          <Timeline
            items={[
              { id: 1, title: "Richiesta inviata", dot: "outlined" },
              { id: 2, title: "Verifica in corso", dot: "filled" },
              { id: 3, title: "Completamento", dot: "small" },
            ]}
          />
        </div>
      </article>
      <aside aria-label="Azioni" className="h-fit rounded-xl border p-5">
        <h2 className="text-label-sb">Azioni disponibili</h2>
        <div className="mt-4">
          <Actions config={config} />
        </div>
      </aside>
    </div>
  )
}

function DrawerBody({ config }: { config: TemplateConfig }) {
  return (
    <div className="relative min-h-128 overflow-hidden rounded-xl border bg-muted">
      <div className="p-8 opacity-60">
        <h1 className="text-title-sm">Contenuto della pagina</h1>
        <p className="mt-2">Il pannello mantiene visibile il contesto sottostante.</p>
      </div>
      <aside
        aria-label={config.title}
        className="absolute inset-y-0 right-0 flex w-(--drawer-width) max-w-[88%] flex-col bg-background shadow-xl"
      >
        <header className="border-b p-6">
          <p className="text-label-mini-sb text-primary">{config.eyebrow}</p>
          <h1 className="text-title-xs">{config.title}</h1>
          <p className="text-muted-foreground">{config.description}</p>
        </header>
        <div className="flex-1 space-y-4 overflow-auto p-6">
          <ListItem value="Prima opzione" chevron />
          <ListItem value="Seconda opzione" chevron />
          <ListItem value="Terza opzione" chevron />
        </div>
        <footer className="border-t p-6">
          <Actions config={config} />
        </footer>
      </aside>
    </div>
  )
}

function RecapBody({ config }: { config: TemplateConfig }) {
  return (
    <div className="mx-auto max-w-3xl">
      <CheckCircle2 aria-hidden="true" className="size-14 text-success" />
      <h1 className="mt-4 text-title-lg">{config.title}</h1>
      <p className="mt-2 text-body text-muted-foreground">{config.description}</p>
      <dl className="my-8 rounded-xl border">
        {[
          ["Servizio", "Pagamento spontaneo"],
          ["Importo", "€ 42,00"],
          ["Identificativo", "PPA-2026-00421"],
        ].map(([term, value]) => (
          <div key={term} className="grid grid-cols-2 gap-4 border-b p-4 last:border-0">
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="text-right text-body-sb">{value}</dd>
          </div>
        ))}
      </dl>
      <Actions config={config} />
    </div>
  )
}

function LegalBody({ config }: { config: TemplateConfig }) {
  return (
    <article className="mx-auto max-w-3xl">
      <p className="text-label-mini-sb text-primary">Ultimo aggiornamento: 5 ottobre 2026</p>
      <h1 className="mt-2 text-title-lg">{config.title}</h1>
      <p className="mt-4 text-body text-muted-foreground">{config.description}</p>
      {["Ambito di applicazione", "Trattamento dei dati", "Diritti delle persone", "Contatti"].map(
        (heading) => (
          <section key={heading} className="mt-8">
            <h2 className="text-title-xs">{heading}</h2>
            <p className="mt-2 leading-7">
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
    <div className="mx-auto max-w-2xl rounded-xl border bg-background shadow-sm">
      <div className="border-b p-6">
        <Brand />
      </div>
      <div className="p-6 sm:p-10">
        <p className="text-label-mini-sb text-primary">{config.eyebrow}</p>
        <h1 className="mt-2 text-title-sm">{config.title}</h1>
        <p className="mt-4 text-body">{config.description}</p>
        <div className="mt-8">
          <Actions config={config} />
        </div>
      </div>
      <div className="bg-muted p-6 text-label-mini text-muted-foreground">
        Messaggio automatico di pagoPA · Non rispondere a questa email.
      </div>
    </div>
  )
}

function FeedbackBody({ config }: { config: TemplateConfig }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="mx-auto grid size-20 place-items-center rounded-full bg-success-soft text-success">
        <CheckCircle2 aria-hidden="true" className="size-11" />
      </span>
      <h1 className="mt-6 text-title-lg">{config.title}</h1>
      <p className="mt-3 text-body text-muted-foreground">{config.description}</p>
      <div className="mt-8 flex justify-center">
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
    <div className={cn("min-h-152 bg-background text-foreground", className)}>
      <a
        href="#main-content"
        className="fixed top-2 left-2 z-[100] -translate-y-20 rounded bg-primary px-4 py-2 text-primary-foreground focus:translate-y-0"
      >
        Vai al contenuto
      </a>
      {!standalone ? <AppHeader compact={config.kind === "drawer"} /> : null}
      <main
        id="main-content"
        className={cn(
          "mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8",
          standalone && "py-10",
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
        <footer className="mt-10 border-t bg-muted">
          <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 px-4 py-8 sm:px-6 lg:px-8">
            <Brand />
            <p className="text-label-mini text-muted-foreground">© 2026 PagoPA S.p.A.</p>
          </div>
        </footer>
      ) : null}
    </div>
  )
}
