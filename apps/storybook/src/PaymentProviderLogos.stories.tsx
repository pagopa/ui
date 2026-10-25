import type { Meta, StoryObj } from "@storybook/react-vite"

import { PaymentProviderLogos } from "@/components/content/payment-provider-logos"
import { figmaEmbedUrl } from "@/catalog/figma/file"
import loghiPspGuide from "./guides/loghi-psp.md?raw"

const pspBrands = [
  "mastercard",
  "maestro",
  "visa",
  "amex",
  "diners",
  "discover",
  "jcb",
  "unionpay",
  "bancomat-pay",
  "pagobancomat",
  "apple-pay",
  "paypal",
  "satispay",
  "mybank",
  "app-postepay",
  "vpay",
] as const

const meta = {
  title: "Components/Content/PaymentProviderLogos",
  component: PaymentProviderLogos,
  args: {
    providers: [{ name: "PSP One" }, { name: "PSP Two" }, { name: "PSP Three" }],
  },
  argTypes: {
    brand: { control: "select", options: [...pspBrands] },
    alt: { control: "text" },
    label: { control: "text" },
    providers: { control: false },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("382:7640") },
    a11y: { test: "error" },
    docs: {
      description: { component: loghiPspGuide },
      subtitle: "Figma: Loghi PSP",
    },
  },
} satisfies Meta<typeof PaymentProviderLogos>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Fidelity: Story = {
  render: () => (
    <ul
      aria-label="Loghi dei prestatori di servizi di pagamento"
      className="m-0 flex list-none flex-wrap items-center gap-3 p-0"
    >
      {pspBrands.map((brand) => (
        <li className="flex size-6 items-center justify-center" key={brand}>
          <PaymentProviderLogos brand={brand} />
        </li>
      ))}
    </ul>
  ),
}
