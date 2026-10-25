"use client"

import * as React from "react"

type LinkComponentProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
  ref?: React.Ref<HTMLAnchorElement>
}

interface UIProviderProps {
  /** Component that renders every navigation link. @default "a" */
  linkComponent?: React.ElementType<LinkComponentProps>
  children: React.ReactNode
}

interface UIContextValue {
  linkComponent: React.ElementType<LinkComponentProps>
}

const UIContext = React.createContext<UIContextValue>({ linkComponent: "a" })

/**
 * Configures the library contexts a tree consumes. Without it every context
 * keeps its default, so the components render as the plain React elements.
 */
function UIProvider({ linkComponent = "a", children }: UIProviderProps) {
  const value = React.useMemo<UIContextValue>(() => ({ linkComponent }), [linkComponent])
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

/** The component a navigation link renders through. @default "a" */
function useLinkComponent() {
  return React.useContext(UIContext).linkComponent
}

export { UIProvider, useLinkComponent }
export type { LinkComponentProps, UIProviderProps }
