import type { Meta, StoryObj } from "@storybook/react-vite"
import { ArrowRight } from "lucide-react"

import { Badge } from "@/components/primitives/badge"
import { Button } from "@/components/primitives/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/primitives/card"

interface ServiceCardProps {
  size?: "default" | "sm"
  variant?: "default" | "product" | "product-image"
}

function ServiceCard({ size, variant }: ServiceCardProps) {
  return (
    <Card size={size} variant={variant} className="w-[min(24rem,calc(100vw-2rem))]">
      <CardHeader>
        <CardTitle className="text-xl">Pagamenti verso la PA</CardTitle>
        <CardDescription>Gestisci avvisi, ricevute e metodi di pagamento.</CardDescription>
        <CardAction>
          <Badge variant="secondary">Attivo</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-body">
          Accedi ai servizi di pagamento digitali in modo semplice e sicuro.
        </p>
      </CardContent>
      <CardFooter className="justify-end bg-muted">
        <Button variant="ghost">
          Apri il servizio
          <ArrowRight aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  )
}

const meta = {
  title: "Components/Card",
  component: Card,
  subcomponents: { CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter },
  args: { size: "default", variant: "default" },
  argTypes: {
    size: { control: "select", options: ["default", "sm"] },
    variant: { control: "select", options: ["default", "product", "product-image"] },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Product card composed from atomic primitives. The action stays a button because it opens an application flow.",
      },
    },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: ({ size, variant }) => <ServiceCard size={size} variant={variant} />,
}
