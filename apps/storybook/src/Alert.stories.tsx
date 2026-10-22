import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import {
  Alert,
  AlertAction,
  AlertContent,
  AlertCopy,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from "@/components/primitives/alert"
import { Button } from "@/components/primitives/button"
import { figmaEmbedUrl } from "@/catalog/figma/file"
import alertGuide from "./guides/alerts.md?raw"

type AlertVariant = NonNullable<React.ComponentProps<typeof Alert>["variant"]>
type AlertDirection = NonNullable<React.ComponentProps<typeof Alert>["direction"]>
type AlertSeverity = "error" | "warning" | "info" | "success"

const severityByVariant: Record<AlertVariant, AlertSeverity> = {
  default: "info",
  info: "info",
  success: "success",
  warning: "warning",
  destructive: "error",
}

const iconBySeverity = {
  error: "report",
  warning: "warning",
  info: "info",
  success: "check_circle",
} as const

const sourceAlerts = [
  { severity: "error", variant: "destructive" },
  { severity: "warning", variant: "warning" },
  { severity: "info", variant: "info" },
  { severity: "success", variant: "success" },
] as const satisfies readonly {
  severity: AlertSeverity
  variant: AlertVariant
}[]

interface SourceAlertProps {
  variant: AlertVariant
  direction: AlertDirection
  testId?: string
  className?: string
  title?: string
  description?: string
  actionLabel?: string
  onAction?: React.ComponentProps<typeof Button>["onClick"]
}

function SourceAlert({
  variant,
  direction,
  testId,
  className,
  title = "Titolo dell’alert",
  description = "Aggiungi un messaggio esplicativo sul motivo della segnalazione.",
  actionLabel = "Ok, ho capito!",
  onAction,
}: SourceAlertProps) {
  const severity = severityByVariant[variant]

  return (
    <Alert
      variant={variant}
      direction={direction}
      role={severity === "error" ? "alert" : "status"}
      className={className}
      data-testid={testId}
    >
      <AlertIcon data-testid={testId ? `${testId}-icon` : undefined}>
        <PagoPAIcon
          name={iconBySeverity[severity]}
          {...(severity === "info" ? { filled: true } : {})}
        />
      </AlertIcon>
      <AlertContent>
        <AlertCopy data-testid={testId ? `${testId}-copy` : undefined}>
          <AlertTitle data-testid={testId ? `${testId}-title` : undefined}>{title}</AlertTitle>
          <AlertDescription data-testid={testId ? `${testId}-description` : undefined}>
            {description}
          </AlertDescription>
        </AlertCopy>
        <AlertAction>
          <Button
            type="button"
            variant="ghost"
            size="default"
            className={
              // Source action: a 16/22 text button (22px box) with no control
              // border. The 44px pointer target comes from the invisible
              // ::after expansion, so the card keeps the source 166px rhythm
              // instead of inflating by the transparent 1px button border.
              direction === "vertical"
                ? "relative min-h-0 w-full justify-start border-0 px-0 py-0 text-current after:absolute after:inset-x-0 after:-inset-y-3"
                : "relative min-h-0 border-0 px-0 py-0 text-current after:absolute after:inset-x-0 after:-inset-y-3"
            }
            onClick={onAction}
            data-testid={testId ? `${testId}-action` : undefined}
          >
            {actionLabel}
          </Button>
        </AlertAction>
      </AlertContent>
    </Alert>
  )
}

const continueSession = fn()

const meta = {
  title: "Components/Alert",
  component: Alert,
  args: { variant: "info", direction: "vertical" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "info", "success", "warning", "destructive"],
    },
    direction: {
      control: "select",
      options: ["vertical", "horizontal"],
    },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("212:1899") },
    docs: {
      description: {
        component: `The four severities are paired with the source icon; error uses \`role="alert"\`, the other updates \`role="status"\`. The caller keeps control of the text and the action.

${alertGuide}`,
      },
    },
  },
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: (args) => (
    <SourceAlert
      variant={args.variant ?? "default"}
      direction={args.direction ?? "vertical"}
      title="Aggiornamento disponibile"
      description="Le nuove informazioni sono state salvate correttamente."
      actionLabel="Continua"
      className="w-68 max-w-full"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("status")).toHaveTextContent("Aggiornamento disponibile")
  },
}

export const AllStatuses: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div className="grid w-fit max-w-full gap-4">
      <div className="grid grid-cols-4 gap-4">
        {sourceAlerts.map(({ severity, variant }) => (
          <SourceAlert
            key={`${severity}-vertical`}
            variant={variant}
            direction="vertical"
            testId={`alert-${severity}-vertical`}
            className="w-68"
          />
        ))}
      </div>
      <div className="grid w-[852px] max-w-full gap-4">
        {sourceAlerts.map(({ severity, variant }) => (
          <SourceAlert
            key={`${severity}-horizontal`}
            variant={variant}
            direction="horizontal"
            testId={`alert-${severity}-horizontal`}
          />
        ))}
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getAllByRole("alert")).toHaveLength(2)
    await expect(canvas.getAllByRole("status")).toHaveLength(6)
    await expect(canvas.getAllByRole("button", { name: "Ok, ho capito!" })).toHaveLength(8)
    await expect(canvas.getByTestId("alert-error-vertical")).toHaveAttribute(
      "data-direction",
      "vertical",
    )
    await expect(canvas.getByTestId("alert-success-horizontal")).toHaveAttribute(
      "data-direction",
      "horizontal",
    )
  },
}

export const WithAction: Story = {
  render: () => (
    <SourceAlert
      variant="warning"
      direction="horizontal"
      testId="alert-with-action"
      title="Sessione in scadenza"
      description="Tra 5 minuti verrai disconnesso per inattività."
      actionLabel="Resta connesso"
      onAction={continueSession}
      className="w-80 max-w-full"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const card = canvas.getByTestId("alert-with-action")
    const copy = canvas.getByTestId("alert-with-action-copy")
    const action = canvas.getByRole("button", { name: "Resta connesso" })
    await expect(card).toHaveAttribute("data-direction", "horizontal")
    await expect(action.getBoundingClientRect().top).toBeGreaterThan(
      copy.getBoundingClientRect().bottom,
    )
    await userEvent.tab()
    await expect(action).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(continueSession).toHaveBeenCalledOnce()
  },
}
