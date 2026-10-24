import type { Meta, StoryObj } from "@storybook/react-vite"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

// One story per option, so a designer can open a single focus rule at the real
// viewport. Review stories live only on the long-lived review pull request
// (`feedback/previews`) and never merge. The glyphs are the source artwork; the
// live control follows the chosen option.

type State = "resting" | "focused" | "invalid"

interface Option {
  key: string
  title: string
  summary: string
  focusedInvalid: boolean
}

const options: Option[] = [
  {
    key: "A",
    title: "Blue focus perimeter, red only when invalid",
    summary:
      "An untouched checkbox keeps its normal glyph when it takes focus. The shared blue perimeter marks focus; red still means the value is wrong.",
    focusedInvalid: false,
  },
  {
    key: "B",
    title: "Red focus, as the Status=Focused source variant draws it",
    summary:
      "An unchecked checkbox turns red as soon as it takes focus, as the source variant draws it. The invalid state needs another cue because red is already used.",
    focusedInvalid: true,
  },
]

function CheckboxVisual({ option, state }: { option: Option; state: State }) {
  const focused = state !== "resting"
  const invalid = state === "invalid" || (focused && option.focusedInvalid)
  return (
    <span
      data-review-state={state}
      className={
        focused
          ? "inline-flex size-6 items-center justify-center rounded-sm outline-2 outline-offset-2 outline-solid outline-ring"
          : "inline-flex size-6 items-center justify-center rounded-sm"
      }
    >
      <PagoPAIcon
        name="check_box"
        variant="unchecked"
        size={24}
        className={invalid ? "text-destructive" : "text-foreground"}
      />
    </span>
  )
}

function StateColumn({
  option,
  state,
  label,
  helper,
}: {
  option: Option
  state: State
  label: string
  helper: string
}) {
  return (
    <div className="flex min-w-36 flex-col gap-3" data-review-state={state}>
      <span className="text-label-mini-sb text-foreground">{label}</span>
      <CheckboxVisual option={option} state={state} />
      <span className="max-w-44 text-label-mini text-muted-foreground">{helper}</span>
    </div>
  )
}

function OptionView({ option }: { option: Option }) {
  return (
    <div className="min-h-dvh p-8">
      <p className="text-title-sb text-foreground">
        {option.key} — {option.title}
      </p>
      <p className="mt-2 mb-8 max-w-3xl text-body text-foreground">{option.summary}</p>
      <div className="flex max-w-3xl flex-wrap gap-10 rounded-lg border border-border bg-background p-6">
        <StateColumn option={option} state="resting" label="Resting" helper="No focus, no error." />
        <StateColumn
          option={option}
          state="focused"
          label="Keyboard focus"
          helper={
            option.focusedInvalid
              ? "Red glyph on focus; the person has not answered yet."
              : "Normal glyph; the blue perimeter alone marks focus."
          }
        />
        <StateColumn
          option={option}
          state="invalid"
          label="Invalid"
          helper={
            option.focusedInvalid
              ? "Red again: the error needs a second cue, such as the helper text."
              : "Red means the value is wrong, not that the field has focus."
          }
        />
      </div>
    </div>
  )
}

const meta = {
  title: "Reviews/Checkbox focus",
  tags: ["!dev", "!test", "!autodocs"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — Blue focus perimeter",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — Red focus",
  render: () => <OptionView option={options[1]} />,
}
