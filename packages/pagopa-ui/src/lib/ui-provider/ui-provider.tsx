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

let portalHost: HTMLElement | undefined

/**
 * The shared, library-styled overlay root. Creating the element is inert: it is
 * detached until a mounted overlay appends it, so rendering never writes to the
 * document and the server has nothing to emit.
 */
function portalHostElement(): HTMLElement | undefined {
  if (typeof document === "undefined") return undefined
  if (!portalHost) {
    const host = document.createElement("div")
    host.className = "pagopa-ui-root"
    host.setAttribute("data-pagopa-ui", "")
    host.setAttribute("data-pagopa-ui-portal-root", "")
    portalHost = host
  }
  return portalHost
}

/**
 * The container every overlay portals into: one library-owned root shared by the
 * whole document, appended after mount. The element identity is stable, so an
 * overlay opened on its first render already has its target and hydration sees
 * the same tree the server produced (no portal markup at all).
 */
function usePortalHost(): HTMLElement | undefined {
  const [host] = React.useState(portalHostElement)
  React.useLayoutEffect(() => {
    if (host && !host.isConnected) document.body.append(host)
  }, [host])
  return host
}

/**
 * Provides component contexts and the root the library stylesheet is scoped
 * to. Without it, contexts use their defaults and inline components are
 * unstyled; overlays always render in the shared portal root.
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
  return (
    <UIContext.Provider value={value}>
      <div className="pagopa-ui-root" data-pagopa-ui="" data-pagopa-ui-root="">
        {children}
      </div>
    </UIContext.Provider>
  )
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

export { UIProvider, useLinkComponent, useLocale, useMessages, usePortalHost }
export type { LinkComponentProps, UIProviderProps }
