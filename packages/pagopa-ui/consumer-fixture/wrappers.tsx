/**
 * Consumer typecheck fixture for `@pagopa/ui`.
 *
 * This file is not built, published or imported by the package: it exists so
 * `consumer:typecheck` compiles it against the published `dist/types` entry
 * only. Every exported component gets a typed wrapper built from its exported
 * props type, so a component whose props type stops being importable, acquires
 * a raw third-party type or requires reaching into `@base-ui/react`, fails here.
 */
import type { Key } from "react"
import type { VariantProps } from "class-variance-authority"

import * as UI from "@pagopa/ui"
import type {
  AccordionProps,
  AlertActionProps,
  AlertContentProps,
  AlertCopyProps,
  AlertDescriptionProps,
  AlertIconProps,
  AlertProps,
  AlertTitleProps,
  AttachmentModuleProps,
  AuthenticationCodeInputProps,
  AutocompleteProps,
  AvatarProps,
  BadgeProps,
  BannerProps,
  BreadcrumbProps,
  ButtonGroupProps,
  ButtonProps,
  CameraViewProps,
  CardActionProps,
  CardContentProps,
  CardDescriptionProps,
  CardFooterProps,
  CardHeaderProps,
  CardProps,
  CardTitleProps,
  CarouselStepperProps,
  CatalogueCardProps,
  CheckboxFieldProps,
  CheckboxGroupProps,
  CheckoutModuleProps,
  ChipProps,
  CookiesProps,
  CorrectionTagProps,
  DatePickerFieldProps,
  DatePickerProps,
  DialogCloseProps,
  DialogProps,
  DownloadCardProps,
  DragAndDropProps,
  DrawerCloseProps,
  DrawerProps,
  DropdownProps,
  EmptyStateProps,
  ErrorStateProps,
  ErrorSummaryProps,
  FeatureListProps,
  FooterProps,
  HeaderAlertProps,
  HeaderProps,
  IdentityProviderPickerProps,
  IdentityProviderPickerRowProps,
  InputChipProps,
  InputProps,
  LabelProps,
  ListItemProps,
  MenuDropdownProps,
  MicroEventProps,
  MultiSelectFieldProps,
  OrganizationModuleProps,
  OverlayProps,
  PageSurfaceProps,
  PaginationProps,
  PagoPAPictogramProps,
  PaymentModuleProps,
  PaymentProviderLogosProps,
  PinPointProps,
  PopoverProps,
  PopperProps,
  PreheaderProps,
  ProductCardProps,
  ProductModuleProps,
  ProgressKpiProps,
  ProgressLoaderProps,
  RadioFieldProps,
  RadioGroupFieldProps,
  SafeAreaProps,
  ScrollToBottomProps,
  SectionHeaderProps,
  SelectFieldProps,
  SeparatorProps,
  SideNavProps,
  SkipToMainContentProps,
  SnackbarErrorCodeProps,
  SnackbarProps,
  SpacerProps,
  SpinnerProps,
  StateProps,
  StatusTileProps,
  StepperProps,
  StickyButtonBarProps,
  SwitchFieldProps,
  SwitchGroupProps,
  SwitchProps,
  TableCellRowProps,
  TableHeaderFieldProps,
  TableListFieldProps,
  TableListItemProps,
  TabsContentProps,
  TabsListProps,
  TabsProps,
  TabsTriggerProps,
  TagProps,
  TextFieldProps,
  TextareaFieldProps,
  TextareaProps,
  TimelineDrawerProps,
  TimelineProps,
  TooltipProps,
  UIProviderProps,
  PagoPAIconProps,
  SegmentedControlProps,
  TableProps,
  TableListProps,
} from "@pagopa/ui"

// One wrapper per exported component, each typed by the props type the
// package exports. A missing or unnameable props type is a compile error.
export const accordion = (props: AccordionProps) => <UI.Accordion {...props} />
export const alert = (props: AlertProps) => <UI.Alert {...props} />
export const alertAction = (props: AlertActionProps) => <UI.AlertAction {...props} />
export const alertContent = (props: AlertContentProps) => <UI.AlertContent {...props} />
export const alertCopy = (props: AlertCopyProps) => <UI.AlertCopy {...props} />
export const alertDescription = (props: AlertDescriptionProps) => <UI.AlertDescription {...props} />
export const alertIcon = (props: AlertIconProps) => <UI.AlertIcon {...props} />
export const alertTitle = (props: AlertTitleProps) => <UI.AlertTitle {...props} />
export const attachmentModule = (props: AttachmentModuleProps) => <UI.AttachmentModule {...props} />
export const authenticationCodeInput = (props: AuthenticationCodeInputProps) => (
  <UI.AuthenticationCodeInput {...props} />
)
export const avatar = (props: AvatarProps) => <UI.Avatar {...props} />
export const badge = (props: BadgeProps) => <UI.Badge {...props} />
export const banner = (props: BannerProps) => <UI.Banner {...props} />
export const breadcrumb = (props: BreadcrumbProps) => <UI.Breadcrumb {...props} />
export const button = (props: ButtonProps) => <UI.Button {...props} />
export const buttonGroup = (props: ButtonGroupProps) => <UI.ButtonGroup {...props} />
export const cameraView = (props: CameraViewProps) => <UI.CameraView {...props} />
export const card = (props: CardProps) => <UI.Card {...props} />
export const cardAction = (props: CardActionProps) => <UI.CardAction {...props} />
export const cardContent = (props: CardContentProps) => <UI.CardContent {...props} />
export const cardDescription = (props: CardDescriptionProps) => <UI.CardDescription {...props} />
export const cardFooter = (props: CardFooterProps) => <UI.CardFooter {...props} />
export const cardHeader = (props: CardHeaderProps) => <UI.CardHeader {...props} />
export const cardTitle = (props: CardTitleProps) => <UI.CardTitle {...props} />
export const carouselStepper = (props: CarouselStepperProps) => <UI.CarouselStepper {...props} />
export const catalogueCard = (props: CatalogueCardProps) => <UI.CatalogueCard {...props} />
export const checkboxField = (props: CheckboxFieldProps) => <UI.CheckboxField {...props} />
export const checkboxGroup = (props: CheckboxGroupProps) => <UI.CheckboxGroup {...props} />
export const checkoutModule = (props: CheckoutModuleProps) => <UI.CheckoutModule {...props} />
export const chip = (props: ChipProps) => <UI.Chip {...props} />
export const cookies = (props: CookiesProps) => <UI.Cookies {...props} />
export const correctionTag = (props: CorrectionTagProps) => <UI.CorrectionTag {...props} />
export const datePickerField = (props: DatePickerFieldProps) => <UI.DatePickerField {...props} />
export const dialog = (props: DialogProps) => <UI.Dialog {...props} />
export const dialogClose = (props: DialogCloseProps) => <UI.DialogClose {...props} />
export const downloadCard = (props: DownloadCardProps) => <UI.DownloadCard {...props} />
export const dragAndDrop = (props: DragAndDropProps) => <UI.DragAndDrop {...props} />
export const drawer = (props: DrawerProps) => <UI.Drawer {...props} />
export const drawerClose = (props: DrawerCloseProps) => <UI.DrawerClose {...props} />
export const dropdown = (props: DropdownProps) => <UI.Dropdown {...props} />
export const emptyState = (props: EmptyStateProps) => <UI.EmptyState {...props} />
export const errorState = (props: ErrorStateProps) => <UI.ErrorState {...props} />
export const errorSummary = (props: ErrorSummaryProps) => <UI.ErrorSummary {...props} />
export const featureList = (props: FeatureListProps) => <UI.FeatureList {...props} />
export const footer = (props: FooterProps) => <UI.Footer {...props} />
export const header = (props: HeaderProps) => <UI.Header {...props} />
export const headerAlert = (props: HeaderAlertProps) => <UI.HeaderAlert {...props} />
export const identityProviderPickerRow = (props: IdentityProviderPickerRowProps) => (
  <UI.IdentityProviderPickerRow {...props} />
)
export const identityProviderPickerView = (props: IdentityProviderPickerProps) => (
  <UI.IdentityProviderPickerView {...props} />
)
export const input = (props: InputProps) => <UI.Input {...props} />
export const inputChip = (props: InputChipProps) => <UI.InputChip {...props} />
export const label = (props: LabelProps) => <UI.Label {...props} />
export const listItem = (props: ListItemProps) => <UI.ListItem {...props} />
export const menuDropdown = (props: MenuDropdownProps) => <UI.MenuDropdown {...props} />
export const microEvent = (props: MicroEventProps) => <UI.MicroEvent {...props} />
export const multiSelectField = (props: MultiSelectFieldProps) => <UI.MultiSelectField {...props} />
export const organizationModule = (props: OrganizationModuleProps) => (
  <UI.OrganizationModule {...props} />
)
export const overlay = (props: OverlayProps) => <UI.Overlay {...props} />
export const pageSurface = (props: PageSurfaceProps) => <UI.PageSurface {...props} />
export const pagination = (props: PaginationProps) => <UI.Pagination {...props} />
export const pagoPAPictogram = (props: PagoPAPictogramProps) => <UI.PagoPAPictogram {...props} />
export const paymentModule = (props: PaymentModuleProps) => <UI.PaymentModule {...props} />
export const pinPoint = (props: PinPointProps) => <UI.PinPoint {...props} />
export const popover = (props: PopoverProps) => <UI.Popover {...props} />
export const popper = (props: PopperProps) => <UI.Popper {...props} />
export const preheader = (props: PreheaderProps) => <UI.Preheader {...props} />
export const productCard = (props: ProductCardProps) => <UI.ProductCard {...props} />
export const productModule = (props: ProductModuleProps) => <UI.ProductModule {...props} />
export const progressKpi = (props: ProgressKpiProps) => <UI.ProgressKpi {...props} />
export const progressLoader = (props: ProgressLoaderProps) => <UI.ProgressLoader {...props} />
export const radioField = (props: RadioFieldProps) => <UI.RadioField {...props} />
export const radioGroup = (props: RadioGroupFieldProps) => <UI.RadioGroup {...props} />
export const safeArea = (props: SafeAreaProps) => <UI.SafeArea {...props} />
export const scrollToBottom = (props: ScrollToBottomProps) => <UI.ScrollToBottom {...props} />
export const sectionHeader = (props: SectionHeaderProps) => <UI.SectionHeader {...props} />
export const selectField = (props: SelectFieldProps) => <UI.SelectField {...props} />
export const separator = (props: SeparatorProps) => <UI.Separator {...props} />
export const sideNav = (props: SideNavProps) => <UI.SideNav {...props} />
export const skipToMainContent = (props: SkipToMainContentProps) => (
  <UI.SkipToMainContent {...props} />
)
export const snackbar = (props: SnackbarProps) => <UI.Snackbar {...props} />
export const snackbarErrorCode = (props: SnackbarErrorCodeProps) => (
  <UI.SnackbarErrorCode {...props} />
)
export const spacer = (props: SpacerProps) => <UI.Spacer {...props} />
export const spinner = (props: SpinnerProps) => <UI.Spinner {...props} />
export const statusTile = (props: StatusTileProps) => <UI.StatusTile {...props} />
export const stepper = (props: StepperProps) => <UI.Stepper {...props} />
export const stickyButtonBar = (props: StickyButtonBarProps) => <UI.StickyButtonBar {...props} />
export const switchControl = (props: SwitchProps) => <UI.Switch {...props} />
export const switchField = (props: SwitchFieldProps) => <UI.SwitchField {...props} />
export const switchGroup = (props: SwitchGroupProps) => <UI.SwitchGroup {...props} />
export const tableCellRow = (props: TableCellRowProps) => <UI.TableCellRow {...props} />
export const tableHeaderField = (props: TableHeaderFieldProps) => <UI.TableHeaderField {...props} />
export const tableListField = (props: TableListFieldProps) => <UI.TableListField {...props} />
export const tableListItem = (props: TableListItemProps) => <UI.TableListItem {...props} />
export const tabs = (props: TabsProps) => <UI.Tabs {...props} />
export const tabsContent = (props: TabsContentProps) => <UI.TabsContent {...props} />
export const tabsList = (props: TabsListProps) => <UI.TabsList {...props} />
export const tabsTrigger = (props: TabsTriggerProps) => <UI.TabsTrigger {...props} />
export const tag = (props: TagProps) => <UI.Tag {...props} />
export const textarea = (props: TextareaProps) => <UI.Textarea {...props} />
export const textareaField = (props: TextareaFieldProps) => <UI.TextareaField {...props} />
export const textField = (props: TextFieldProps) => <UI.TextField {...props} />
export const timeline = (props: TimelineProps) => <UI.Timeline {...props} />
export const timelineDrawer = (props: TimelineDrawerProps) => <UI.TimelineDrawer {...props} />
export const tooltip = (props: TooltipProps) => <UI.Tooltip {...props} />
export const uiProvider = (props: UIProviderProps) => <UI.UIProvider {...props} />
export const successState = (props: StateProps) => <UI.SuccessState {...props} />
export const waitingState = (props: StateProps) => <UI.WaitingState {...props} />
export const autocomplete = (props: AutocompleteProps) => <UI.Autocomplete {...props} />
export const datePicker = (props: DatePickerProps) => <UI.DatePicker {...props} />
export const paymentProviderLogos = (props: PaymentProviderLogosProps) => (
  <UI.PaymentProviderLogos {...props} />
)

export const pagoPAIcon = <Name extends UI.FigmaIconName>(props: PagoPAIconProps<Name>) => (
  <UI.PagoPAIcon {...props} />
)

export const segmentedControl = <T extends string>(props: SegmentedControlProps<T>) => (
  <UI.SegmentedControl {...props} />
)

interface Row extends Record<string, unknown> {
  id: Key
}

export const table = (props: TableProps<Row>) => <UI.Table {...props} />

export const tableList = (props: TableListProps<Row>) => <UI.TableList {...props} />

// Variant helpers are part of the API too: their variant props must be
// readable without importing `class-variance-authority` internals.
export const buttonStyles = (props: VariantProps<typeof UI.buttonVariants>) =>
  UI.buttonVariants(props)

export const badgeStyles = (props: VariantProps<typeof UI.badgeVariants>) => UI.badgeVariants(props)

export const alertStyles = (props: VariantProps<typeof UI.alertVariants>) => UI.alertVariants(props)

export const alertContentStyles = (props: VariantProps<typeof UI.alertContentVariants>) =>
  UI.alertContentVariants(props)

export const tabsListStyles = (props: VariantProps<typeof UI.tabsListVariants>) =>
  UI.tabsListVariants(props)

// The value types are the wrapper's own, not a `@base-ui/react` namespace
// export: a leaked primitive type would not accept these plain literals.
export const accordionValue: NonNullable<AccordionProps["value"]> = ["shipping", "payment"]

export const dialogOpen: NonNullable<DialogProps["open"]> = true

export const tabsValue: NonNullable<TabsProps["value"]> = "first"

// @ts-expect-error -- `AccordionProps["value"]` is the wrapper's `string[]`, never a single string.
export const rejectedAccordionValue: NonNullable<AccordionProps["value"]> = "shipping"

// @ts-expect-error -- `TableProps` has no `variant` axis to fall back on.
export const rejectedTable: TableProps<Row> = { variant: "compact" }
