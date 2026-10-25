export * from "./components/icons"
export * from "./components/inputs"
export * from "./components/navigation"
export * from "./components/feedback"
export * from "./components/content"
export * from "./components/data-display"
export * from "./components/composites"
export * from "./components/overlays"

// Screens and mocked Figma templates remain Storybook demos, not production API.

export { UIProvider } from "./lib/ui-provider"
export { enMessages, itMessages } from "./lib/ui-provider"
export type { LinkComponentProps, Messages, UIProviderProps } from "./lib/ui-provider"

export { Alert, AlertAction, AlertDescription, AlertTitle } from "./components/primitives/alert"
export { Badge } from "./components/primitives/badge"
export { Button } from "./components/primitives/button"
export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/primitives/card"
export { Input } from "./components/primitives/input"
export { Label } from "./components/primitives/label"
export { Separator } from "./components/primitives/separator"
export { Switch } from "./components/primitives/switch"
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/primitives/tabs"
export { Textarea } from "./components/primitives/textarea"
