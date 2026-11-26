import * as React from "react"
import { createRoot } from "react-dom/client"
import { Button, Dialog, UIProvider } from "__PAGOPA_UI_PACKAGE__"

function LegacyScreen() {
  return (
    <div id="legacy-screen">
      <h2 id="legacy-heading">Legacy heading</h2>
      <p id="legacy-paragraph">
        Legacy paragraph copy with <a href="#legacy">a link</a>.
      </p>
      <ul id="legacy-list">
        <li>Legacy item</li>
      </ul>
      <button id="legacy-action" type="button">
        Legacy action
      </button>
      <button id="mui-action" className="MuiButtonBase-root MuiButton-root" type="button">
        Legacy MUI action
      </button>
      <div id="legacy-utility" className="p-6">
        Legacy utility box
      </div>
    </div>
  )
}

function Consumer() {
  return (
    <UIProvider>
      <LegacyScreen />
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
