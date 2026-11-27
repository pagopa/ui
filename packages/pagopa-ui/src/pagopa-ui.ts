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
export type {
  DeepPartial,
  LinkComponentProps,
  Messages,
  StepperStatus,
  UIProviderProps,
} from "./lib/ui-provider"

export {
  Alert,
  AlertAction,
  AlertContent,
  AlertCopy,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from "./components/primitives/alert"
export { alertVariants } from "./components/primitives/alert"
export { Badge, badgeVariants } from "./components/primitives/badge"
export { Button, buttonVariants } from "./components/primitives/button"
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
export {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  tabsListVariants,
} from "./components/primitives/tabs"
export { Textarea } from "./components/primitives/textarea"

export type {
  AlertActionProps,
  AlertContentProps,
  AlertCopyProps,
  AlertDescriptionProps,
  AlertDirection,
  AlertIconProps,
  AlertProps,
  AlertTitleProps,
} from "./components/primitives/alert"
export { alertContentVariants } from "./components/primitives/alert"
export type { BadgeBackground, BadgeDisplay, BadgeProps } from "./components/primitives/badge"
export type { ButtonProps } from "./components/primitives/button"
export type { CalendarLocale } from "./components/primitives/calendar"
export type {
  CardActionProps,
  CardContentProps,
  CardDescriptionProps,
  CardFooterProps,
  CardHeaderProps,
  CardProps,
  CardTitleProps,
} from "./components/primitives/card"
export type { InputProps } from "./components/primitives/input"
export type { LabelProps } from "./components/primitives/label"
export type { TextareaProps } from "./components/primitives/textarea"
export type { CheckboxProps } from "./components/primitives/checkbox"
export type { HeadingTag } from "./components/primitives/heading"
export type { OTPFieldProps } from "./components/primitives/otp-field"
export type { RadioGroupItemProps, RadioGroupProps } from "./components/primitives/radio-group"
export type { SeparatorProps } from "./components/primitives/separator"
export type { SwitchProps } from "./components/primitives/switch"
export type {
  TabsContentProps,
  TabsListProps,
  TabsProps,
  TabsTriggerProps,
  TabsValue,
} from "./components/primitives/tabs"
export type {
  ChangeEventDetails,
  ElementProps,
  GenericEventDetails,
} from "./components/primitives/props"
