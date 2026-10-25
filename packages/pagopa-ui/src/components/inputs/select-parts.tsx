"use client"

import * as React from "react"

import { Button } from "@/components/primitives/button"
import { SelectItem } from "@/components/primitives/select"

import type { ChoiceAction } from "./choice-action"
import { ItemRow, type ItemRowContent } from "./item-row"

// Shared internals of the select fields: option type, option row, the header
// action and its reverse-tab focus helper. Kept out of the public barrel.
type SelectOption = ItemRowContent & {
  value: string
  disabled?: boolean
}

function SelectOptionItem({ option, multiple }: { option: SelectOption; multiple?: boolean }) {
  return (
    <ItemRow
      {...option}
      multiple={multiple}
      render={(attributes) => (
        <SelectItem
          {...attributes}
          value={option.value}
          disabled={option.disabled}
          multiple={multiple}
        />
      )}
    />
  )
}

function ChoiceActionButton({
  action,
  onAction,
  buttonRef,
}: {
  action: ChoiceAction
  onAction: () => void
  buttonRef: React.Ref<HTMLButtonElement>
}) {
  return (
    <Button
      ref={buttonRef}
      type="button"
      variant="ghost"
      disabled={action.disabled}
      onClick={onAction}
      className="min-h-12 w-full justify-start rounded-none"
    >
      {action.leading ? (
        <span
          aria-hidden="true"
          inert
          className="pointer-events-none inline-flex shrink-0 [&>svg]:size-6!"
        >
          {action.leading}
        </span>
      ) : null}
      {action.label}
    </Button>
  )
}

function focusChoiceActionOnReverseTab(
  event: React.KeyboardEvent<HTMLDivElement>,
  action: ChoiceAction | undefined,
  actionButtonRef: React.RefObject<HTMLButtonElement | null>,
) {
  const list = event.currentTarget.querySelector('[role="listbox"]')
  if (
    !action ||
    action.disabled ||
    event.key !== "Tab" ||
    !event.shiftKey ||
    !(event.target instanceof Node) ||
    !list?.contains(event.target)
  ) {
    return
  }

  const actionButton = actionButtonRef.current
  if (!actionButton) return

  event.preventDefault()
  actionButton.focus()
}

export { ChoiceActionButton, SelectOptionItem, focusChoiceActionOnReverseTab, type SelectOption }
