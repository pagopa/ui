import { TemplateShell, type TemplateProps } from "./TemplateShell"
import { templateConfigs } from "./templateConfigs"

type ConfigName = keyof typeof templateConfigs

function Template({ name, className, config }: TemplateProps & { name: ConfigName }) {
  return <TemplateShell className={className} config={{ ...templateConfigs[name], ...config }} />
}

// The 23 exports below are the targets of the 24 `mocked` registry entries on
// the `◆ KEY TEMPLATE` page. They are demo compositions on top of the shared
// `TemplateShell`, not implementations of the source sets: they stay private,
// outside the library entry and coverage, until each node is implemented for
// real (registry status and note are the source of truth).
export function Dashboard(props: TemplateProps) {
  return <Template name="Dashboard" {...props} />
}
export function EditDrawer(props: TemplateProps) {
  return <Template name="EditDrawer" {...props} />
}
export function FilterDrawer(props: TemplateProps) {
  return <Template name="FilterDrawer" {...props} />
}
export function FormTemplate(props: TemplateProps) {
  return <Template name="FormTemplate" {...props} />
}
export function FormWizardTemplate(props: TemplateProps) {
  return <Template name="FormWizardTemplate" {...props} />
}
export function HistoryDrawer(props: TemplateProps) {
  return <Template name="HistoryDrawer" {...props} />
}
export function Homepage(props: TemplateProps) {
  return <Template name="Homepage" {...props} />
}
export function IdentityProviderSelector(props: TemplateProps) {
  return <Template name="IdentityProviderSelector" {...props} />
}
export function InformativaPrivacy(props: TemplateProps) {
  return <Template name="InformativaPrivacy" {...props} />
}
export function ListView(props: TemplateProps) {
  return <Template name="ListView" {...props} />
}
export function MultipleCtaDashboard(props: TemplateProps) {
  return <Template name="MultipleCtaDashboard" {...props} />
}
export function ObjectDetail(props: TemplateProps) {
  return <Template name="ObjectDetail" {...props} />
}
export function RecapDefault(props: TemplateProps) {
  return <Template name="RecapDefault" {...props} />
}
export function SearchDrawer(props: TemplateProps) {
  return <Template name="SearchDrawer" {...props} />
}
export function ServiceDetailDrawer(props: TemplateProps) {
  return <Template name="ServiceDetailDrawer" {...props} />
}
export function TableListView(props: TemplateProps) {
  return <Template name="TableListView" {...props} />
}
export function TemplateEmail(props: TemplateProps) {
  return <Template name="TemplateEmail" {...props} />
}
export function TermsOfUse(props: TemplateProps) {
  return <Template name="TermsOfUse" {...props} />
}
