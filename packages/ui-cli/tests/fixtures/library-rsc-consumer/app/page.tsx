// A Server Component with no directive: a client component (Button), a
// server-safe one (Tag) and the provider all render from here.
import { Button, Tag, UIProvider } from "__PAGOPA_UI_PACKAGE__"

export default function Page() {
  return (
    <UIProvider>
      <main>
        <h1>Server Component</h1>
        <Tag status="success">Attivo</Tag>
        <Button>Continua</Button>
      </main>
    </UIProvider>
  )
}
