import type { Preview } from "@storybook/react-vite"
import { useEffect, type ReactNode } from "react"
import "../src/preview.css"
import { a11yContractAfterEach } from "../src/support/a11y-contract"

// The design system content is Italian: keep the document language correct for
// assistive technologies and axe (WCAG 3.1.1) inside the preview iframe.
function ItalianLanguage({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = "it"
  }, [])
  return children
}

const preview: Preview = {
  // Every meta gets the generated Docs page (`--docs` entry): the existing
  // `docs.description.component` prose, the props table extracted by the
  // react-docgen engine and the stories. The tag replaced the removed
  // `docs.autodocs` main-config option in Storybook 9.
  tags: ["autodocs"],
  // The shared accessibility contract (src/support/a11y-contract.ts):
  // every story is verified after its own play for keyboard order, names,
  // widget behaviour and the 320px/text-spacing conditions. It is a no-op
  // outside the browser test runner.
  afterEach: [a11yContractAfterEach],
  decorators: [
    (Story) => (
      <ItalianLanguage>
        <Story />
      </ItalianLanguage>
    ),
  ],
  parameters: {
    // Sidebar order: Foundations, then Components, alphabetical at every level
    // (folders and single components interleaved). Storybook parses this file
    // statically, so `storySort` must stay inline and literal. Without it the
    // tree follows the story file load order: `Accordion.stories.tsx` is loaded
    // first and its `Components/Navigation/Accordion` title opened Components
    // before Foundations.
    options: {
      storySort: {
        order: ["Foundations", "Components"],
        method: "alphabetical",
        locales: "it-IT",
      },
    },
    backgrounds: {
      options: {
        light: { name: "PagoPA light", value: "#ffffff" },
        soft: { name: "PagoPA soft", value: "#f4f5f8" },
        brand: { name: "PagoPA brand", value: "#0b3ee3" },
      },
    },
    layout: "centered",
    controls: {
      // Controls panel: every control open with its description and default
      // value, required props first; color/date values pick the right control.
      expanded: true,
      sort: "requiredFirst",
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      test: "error",
      // Base UI's focus guards (dialog/menu focus containment) are focusable
      // spans that are intentionally hidden from assistive tech; axe reports
      // them as a false positive. Exclude only that element instead of
      // disabling the `aria-hidden-focus` rule for every story, so genuine
      // violations elsewhere still fail the tests. See .migration/project.md.
      context: {
        exclude: [["[data-base-ui-focus-guard]"]],
      },
    },
  },
}

export default preview
