import * as React from "react"
import { createRoot } from "react-dom/client"
import { Button, Dialog, UIProvider } from "__PAGOPA_UI_PACKAGE__"

function Consumer() {
  return (
    <UIProvider>
      <Button data-testid="library-action">Library action</Button>
      <Button data-testid="overridden-action" style={{ backgroundColor: "rgb(1, 2, 3)" }}>
        Overridden action
      </Button>
      <Dialog
        trigger={<Button data-testid="dialog-trigger">Open dialog</Button>}
        title="Example dialog"
        closeLabel="Close dialog"
      >
        <p>Dialog content</p>
      </Dialog>
    </UIProvider>
  )
}

createRoot(document.getElementById("library-mount")).render(<Consumer />)
