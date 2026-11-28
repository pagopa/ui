"use client"

import * as React from "react"
import type { CalendarLocale } from "@/components/primitives/calendar"
import { it } from "react-day-picker/locale"
import { cn } from "@/lib/cn"

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
  calendarLocale?: CalendarLocale
  /**
   * Added to the provider root, and repeated on the portal root so a theme
   * class reaches overlays too. @default undefined
   */
  className?: string
  /**
   * Declared on the provider root. Custom properties (`--*`) are repeated on
   * the portal root, where they theme overlays; other declarations stay on the
   * provider element. @default undefined
   */
  style?: React.CSSProperties & Record<`--${string}`, string | number>
  children: React.ReactNode
}

interface UIContextValue {
  linkComponent: React.ElementType<LinkComponentProps>
  locale: string
  messages: Messages
  calendarLocale: CalendarLocale
  /** Nesting depth of the provider, so the innermost theme scope wins. */
  depth: number
}

const UIContext = React.createContext<UIContextValue>({
  linkComponent: "a",
  locale: "it-IT",
  messages: itMessages,
  calendarLocale: it,
  depth: 0,
})

const HOST_CLASS = "pagopa-ui-root"

interface ThemeScope {
  className?: string
  style?: React.CSSProperties
  depth: number
}

/**
 * The mounted providers, in no particular order: effects run child-first, so
 * nesting is read from `depth` rather than from the order of arrival.
 */
const themeScopes: ThemeScope[] = []
const hostProperties = new Set<string>()

/**
 * Repeats the nearest provider's theme scope on the shared portal root. The
 * overlays leave the provider's DOM branch, so without this a `--pui-*` value
 * or a theme class declared on the provider stops at the portal boundary.
 */
function syncPortalTheme(host: HTMLElement | undefined) {
  if (!host) return
  const scope = themeScopes.reduce<ThemeScope | undefined>(
    (innermost, scope) => (innermost && innermost.depth >= scope.depth ? innermost : scope),
    undefined,
  )
  host.className = scope?.className ? cn(HOST_CLASS, scope.className) : HOST_CLASS
  for (const property of hostProperties) host.style.removeProperty(property)
  hostProperties.clear()
  for (const [name, value] of Object.entries(scope?.style ?? {})) {
    // A custom property needs no unit and inherits into every portalled
    // subtree; any other declaration describes the provider element itself.
    if (!name.startsWith("--") || value == null) continue
    host.style.setProperty(name, String(value))
    hostProperties.add(name)
  }
}

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
    host.className = HOST_CLASS
    host.setAttribute("data-pagopa-ui", "")
    host.setAttribute("data-pagopa-ui-portal-root", "")
    portalHost = host
    syncPortalTheme(host)
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
  className,
  style,
  children,
}: UIProviderProps) {
  const parent = React.useContext(UIContext)
  React.useEffect(() => {
    const scope: ThemeScope = { className, style, depth: parent.depth }
    themeScopes.push(scope)
    syncPortalTheme(portalHost)
    return () => {
      const index = themeScopes.indexOf(scope)
      if (index !== -1) themeScopes.splice(index, 1)
      syncPortalTheme(portalHost)
    }
  }, [className, style, parent.depth])
  const value = React.useMemo<UIContextValue>(
    () => ({
      linkComponent: linkComponent ?? parent.linkComponent,
      locale: locale ?? parent.locale,
      messages: messages ? mergeMessages(parent.messages, messages) : parent.messages,
      calendarLocale: calendarLocale ?? parent.calendarLocale,
      depth: parent.depth + 1,
    }),
    [linkComponent, locale, messages, calendarLocale, parent],
  )
  return (
    <UIContext.Provider value={value}>
      <div
        className={cn(HOST_CLASS, className)}
        style={style}
        data-slot="ui-provider"
        data-pagopa-ui=""
        data-pagopa-ui-root=""
      >
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
function useLocale(): { locale: string; calendarLocale: CalendarLocale } {
  const { locale, calendarLocale } = React.useContext(UIContext)
  return React.useMemo(() => ({ locale, calendarLocale }), [locale, calendarLocale])
}

export { UIProvider, useLinkComponent, useLocale, useMessages, usePortalHost }
export type { LinkComponentProps, UIProviderProps }
