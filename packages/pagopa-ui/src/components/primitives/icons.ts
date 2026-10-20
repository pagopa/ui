// Single seam for the UI icon set used by the shipped families and the other
// primitives. lucide-react is a third-party runtime: the import contract keeps
// it inside the primitives layer (import layer contract, enforced by
// `pnpm layers:check`), so replacing the iconography
// later touches this file and the call sites, not eighteen modules.
export {
  ArrowDown,
  ArrowUpDown,
  Building2,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  CheckIcon,
  ChevronDown,
  ChevronDownIcon,
  ChevronLeft,
  ChevronRight,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronsUpDown,
  CircleAlert,
  Clock3,
  Cookie,
  CreditCard,
  Crosshair,
  Download,
  EllipsisVertical,
  FileText,
  FileUp,
  ImageIcon,
  Info,
  LoaderCircle,
  Menu,
  MinusIcon,
  Package,
  ShieldCheck,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react"
export type { LucideIcon } from "lucide-react"
