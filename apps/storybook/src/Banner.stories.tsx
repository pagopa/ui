import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { Banner } from "@/components/feedback/banner"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"
import { Chip } from "@/components/inputs/chips"
import { Button } from "@/components/primitives/button"
import { figmaEmbedUrl } from "@/catalog/figma/file"
import bannerGuide from "./guides/banners.md?raw"

type BannerSourceArgs = Pick<
  React.ComponentProps<typeof Banner>,
  "color" | "hierarchy" | "direction"
>

// Source action geometry (`261:6560`, `324:5114`, `3344:39496`): the Primary and
// Tertiary actions are 16/22 text buttons (21/22px visible lines) whose 44px
// pointer target comes from the invisible ::after expansion — never from an
// inflated visible box; Secondary keeps the genuine 149×48 contained button.
function SourceBannerAction({ hierarchy }: Pick<BannerSourceArgs, "hierarchy">) {
  if (hierarchy === "secondary") {
    return (
      <Button type="button" variant="default" className="min-h-12 px-6">
        Vai all’iniziativa
      </Button>
    )
  }

  if (hierarchy === "primary") {
    return (
      <Button
        type="button"
        variant="ghost"
        className="relative min-h-0 px-0 py-0 after:absolute after:inset-x-0 after:-inset-y-3"
      >
        Vai all’iniziativa
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="link"
      className="relative min-h-0 w-full justify-start px-0 py-0 after:absolute after:inset-x-0 after:-inset-y-3"
    >
      Scopri di più
    </Button>
  )
}

function SourceBannerCase({
  color = "white",
  hierarchy = "primary",
  direction = "horizontal",
  title,
  children,
}: BannerSourceArgs & { title?: React.ReactNode; children?: React.ReactNode }) {
  const primary = hierarchy === "primary"
  const tertiary = hierarchy === "tertiary"

  const actions = <SourceBannerAction hierarchy={hierarchy} />

  return (
    <Banner
      color={color}
      hierarchy={hierarchy}
      direction={direction}
      title={
        title ??
        (tertiary
          ? "Titolo del banner"
          : primary
            ? "Titolo del banner primario"
            : "Titolo del banner primario su più righe")
      }
      chip={
        primary ? (
          <Chip variant="highlight" size="compact">
            Novità
          </Chip>
        ) : undefined
      }
      icon={
        tertiary && color !== "grey" ? (
          <PagoPAIcon name="emoji_objects" size={24} className="text-choice-icon" />
        ) : undefined
      }
      pictogram={
        primary ? (
          <PagoPAPictogram name="Push" size={direction === "vertical" ? 56 : 80} />
        ) : tertiary && color === "grey" ? (
          <PagoPAPictogram name="Push" size={40} />
        ) : undefined
      }
      actions={actions}
      onDismiss={() => undefined}
    >
      {children ??
        (tertiary
          ? "Ut enim ad minim veniam, quis ullamco laboris nisi ut aliquid"
          : "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.")}
    </Banner>
  )
}

const meta = {
  title: "Components/Feedback/Banner",
  component: Banner,
  args: {
    color: "white",
    hierarchy: "secondary",
    direction: "horizontal",
    title: "Novità sul servizio",
    children: "Da oggi puoi salvare i tuoi metodi di pagamento preferiti.",
  },
  argTypes: {
    color: { control: "select", options: ["white", "primary", "grey"] },
    hierarchy: { control: "select", options: ["primary", "secondary", "tertiary"] },
    direction: { control: "select", options: ["horizontal", "vertical"] },
    titleAs: { control: "select", options: ["h2", "h3", "h4"] },
    label: { control: "text" },
    actions: { control: false },
    chip: { control: false },
    icon: { control: false },
    pictogram: { control: false },
    onDismiss: { control: false },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("261:6501") },
    docs: {
      description: {
        component: `Contextual notice with the source hierarchy variants and the adaptive direction. The title is optional, as in the source \`Title\` boolean; when it is absent, \`label\` names the status region.\n\n${bannerGuide}`,
      },
    },
  },
} satisfies Meta<typeof Banner>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  // The fixture carries the source frame: the banner variants are 852px wide in
  // the set (`261:6548`/`324:5019`/`3344:39485`), so the preview a human opens is
  // framed at `w-213` (852px) with the source close, chip, pictogram and action
  // per hierarchy instead of a bare title/body at the viewport width.
  render: (args) => (
    <div className="w-213 max-w-full">
      <SourceBannerCase
        color={args.color}
        hierarchy={args.hierarchy}
        direction={args.direction}
        title={args.title}
      >
        {args.children}
      </SourceBannerCase>
    </div>
  ),
}

export const SourceHierarchies: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div className="grid w-full gap-4">
      <SourceBannerCase color="white" hierarchy="primary" direction="horizontal" />
      <SourceBannerCase color="white" hierarchy="secondary" direction="horizontal" />
      <SourceBannerCase color="white" hierarchy="tertiary" direction="vertical" />
      <SourceBannerCase color="grey" hierarchy="tertiary" direction="vertical" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getAllByRole("status")).toHaveLength(4)
    await expect(canvas.getAllByRole("button", { name: "Chiudi avviso" })).toHaveLength(4)
  },
}

export const SourceCase: Story = {
  tags: ["live-region"],
  args: { color: "white", hierarchy: "primary", direction: "horizontal" },
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <SourceBannerCase color={args.color} hierarchy={args.hierarchy} direction={args.direction} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("status")).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Chiudi avviso" })).toBeVisible()
  },
}

// The source pairs the mobile device with `Direction=Vertical` (`374:12526`,
// `374:12627`): the same white/primary case in the vertical arrangement, which
// the horizontal prop stacks below `md` at a mobile viewport.
export const SourceCaseVertical: Story = {
  args: { color: "white", hierarchy: "primary", direction: "vertical" },
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <SourceBannerCase color={args.color} hierarchy={args.hierarchy} direction={args.direction} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("status")).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Chiudi avviso" })).toBeVisible()
  },
}

function DismissableBanner() {
  const [visible, setVisible] = React.useState(true)
  if (!visible) return <output>Avviso chiuso</output>
  return (
    <Banner
      color="primary"
      hierarchy="secondary"
      direction="horizontal"
      title="Novità sul servizio"
      onDismiss={() => setVisible(false)}
      actions={
        <Button
          type="button"
          variant="default"
          size="sm"
          className="min-h-12 px-6 text-label-mini font-semibold"
        >
          Scopri di più
        </Button>
      }
    >
      Da oggi puoi salvare i tuoi metodi di pagamento preferiti.
    </Banner>
  )
}

export const Dismissable: Story = {
  render: () => <DismissableBanner />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Chiudi avviso" }))
    await expect(canvas.getByText("Avviso chiuso")).toBeVisible()
  },
}

export const WithoutTitle: Story = {
  // The source `Title` boolean allows a banner with no heading; the region is
  // named by `label` instead of an empty heading.
  render: () => (
    <div className="w-213 max-w-full">
      <Banner
        color="white"
        hierarchy="secondary"
        label="Nuova comunicazione"
        actions={
          <Button type="button" variant="default" size="sm" className="min-h-12 px-6">
            Scopri di più
          </Button>
        }
      >
        Da oggi puoi salvare i tuoi metodi di pagamento preferiti.
      </Banner>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const banner = canvas.getByRole("status", { name: "Nuova comunicazione" })
    await expect(banner).toBeVisible()
    await expect(within(banner).queryByRole("heading")).not.toBeInTheDocument()
    await expect(
      within(banner).queryByRole("button", { name: "Chiudi avviso" }),
    ).not.toBeInTheDocument()
    await expect(within(banner).getByRole("button", { name: "Scopri di più" })).toBeVisible()
  },
}
