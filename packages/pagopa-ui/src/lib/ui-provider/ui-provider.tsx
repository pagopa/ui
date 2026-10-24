"use client"

import * as React from "react"
import type { DayPickerLocale } from "react-day-picker"
import { it } from "react-day-picker/locale"

import { itMessages } from "./messages/it"
import { mergeMessages } from "./messages/merge"
import type { DeepPartial, Messages } from "./messages/types"

type LinkComponentProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
  ref?: React.Ref<HTMLAnchorElement>
}

interface UIProviderProps {
  /** Component that renders every navigation link. @default "a" */
  linkComponent?: React.ElementType<LinkComponentProps>
  /** BCP 47 code of the tree, used by the formats that read it. @default "it-IT" */
  locale?: string
  /**
   * Dictionary merged over the one of the enclosing provider, or over the
   * Italian default at the root. A group keeps the keys it does not name.
   */
  messages?: DeepPartial<Messages>
  /**
   * Calendar locale of the tree. @default the Italian locale of the calendar
   * primitive
   */
  calendarLocale?: DayPickerLocale
  children: React.ReactNode
}

interface UIContextValue {
  linkComponent: React.ElementType<LinkComponentProps>
  locale: string
  messages: Messages
  calendarLocale: DayPickerLocale
}

const UIContext = React.createContext<UIContextValue>({
  linkComponent: "a",
  locale: "it-IT",
  messages: itMessages,
  calendarLocale: it,
})

/**
 * Configures the library contexts a tree consumes. Without it every context
 * keeps its default, so the components render as the plain React elements with
 * the Italian default dictionary.
 */
function UIProvider({
  linkComponent,
  locale,
  messages,
  calendarLocale,
  children,
}: UIProviderProps) {
  const parent = React.useContext(UIContext)
  const value = React.useMemo<UIContextValue>(
    () => ({
      linkComponent: linkComponent ?? parent.linkComponent,
      locale: locale ?? parent.locale,
      messages: messages ? mergeMessages(parent.messages, messages) : parent.messages,
      calendarLocale: calendarLocale ?? parent.calendarLocale,
    }),
    [linkComponent, locale, messages, calendarLocale, parent],
  )
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

/** The component a navigation link renders through. @default "a" */
function useLinkComponent() {
  return React.useContext(UIContext).linkComponent
}

/** The dictionary of one component, from the nearest provider. @default `itMessages` */
function useMessages<K extends keyof Messages>(key: K): Messages[K] {
  return React.useContext(UIContext).messages[key]
}

/** The locale of the tree, from the nearest provider. @default "it-IT" */
function useLocale(): { locale: string; calendarLocale: DayPickerLocale } {
  const { locale, calendarLocale } = React.useContext(UIContext)
  return React.useMemo(() => ({ locale, calendarLocale }), [locale, calendarLocale])
}

export { UIProvider, useLinkComponent, useLocale, useMessages }
export type { LinkComponentProps, UIProviderProps }
