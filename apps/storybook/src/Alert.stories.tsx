import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"

import { Default as CheckCircleIcon } from "@/components/icons/generated/check-circle"
import { Filled as InfoFilledIcon } from "@/components/icons/generated/info"
import { Default as ReportIcon } from "@/components/icons/generated/report"
import { Default as WarningIcon } from "@/components/icons/generated/warning"
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
  error: ReportIcon,
  warning: WarningIcon,
  info: InfoFilledIcon,
  success: CheckCircleIcon,
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
  const SeverityIcon = iconBySeverity[severity]

  return (
    <Alert
      variant={variant}
      direction={direction}
      role={severity === "error" ? "alert" : "status"}
      className={className}
      data-testid={testId}
    >
      <AlertIcon data-testid={testId ? `${testId}-icon` : undefined}>
        <SeverityIcon />
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
                ? "pui:relative pui:min-h-0 pui:w-full pui:justify-start pui:border-0 pui:px-0 pui:py-0 pui:text-current pui:after:absolute pui:after:inset-x-0 pui:after:-inset-y-3"
                : "pui:relative pui:min-h-0 pui:border-0 pui:px-0 pui:py-0 pui:text-current pui:after:absolute pui:after:inset-x-0 pui:after:-inset-y-3"
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
  // Reflow exemption debt, tracked in https://github.com/pagopa/ui/issues/192.
  parameters: { a11yContract: { reflow: false } },
  render: (args) => (
    <SourceAlert
      variant={args.variant ?? "default"}
      direction={args.direction ?? "vertical"}
      title="Aggiornamento disponibile"
      description="Le nuove informazioni sono state salvate correttamente."
      actionLabel="Continua"
      className="pui:w-68 pui:max-w-full"
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
    <div className="pui:grid pui:w-fit pui:max-w-full pui:gap-4">
      <div className="pui:grid pui:grid-cols-4 pui:gap-4">
        {sourceAlerts.map(({ severity, variant }) => (
          <SourceAlert
            key={`${severity}-vertical`}
            variant={variant}
            direction="vertical"
            testId={`alert-${severity}-vertical`}
            className="pui:w-68"
          />
        ))}
      </div>
      <div className="pui:grid pui:w-[852px] pui:max-w-full pui:gap-4">
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
      className="pui:w-80 pui:max-w-full"
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
