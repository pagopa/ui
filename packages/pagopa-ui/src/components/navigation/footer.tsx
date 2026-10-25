import * as React from "react"

import { cn } from "@/lib/cn"
import { useLinkComponent, useMessages } from "@/lib/ui-provider"
import { Heading, type HeadingTag } from "@/components/primitives/heading"

import type { NavItem } from "./nav-item"

// Source company-information sentence (Footer `1360:20138` → the
// `.CompanyInformation` row).
const COMPANY_INFORMATION =
  "PagoPA S.p.A. - Società per azioni - Capitale sociale di euro 1,000,000 interamente versato - Sede legale in Roma, Piazza Colonna 370, CAP 00187 - N. di iscrizione a Registro Imprese di Roma, CF e P.IVA 15376371009"

// Source link rows (`Label & Caption/Label Mini SB`, 14/20). `trailing` carries
// the artwork the source places after the label (the language chevron in the
// Logged user=False column 4); a row with artwork keeps the source 24px height.
// The rows read label/href/current/icon/trailing: the nav-item fields the
// footer does not render stay out of the contract.
type FooterLink = Omit<NavItem, "badge" | "children"> & { trailing?: React.ReactNode }

// Source `Social link` row: 24px media artwork, 32px apart (1360:12707).
interface FooterSocialLink {
  label: string
  href: string
  icon: React.ReactNode
}

// Source `Column` (1360:12672, 12680, 12691, 12703). Column 1 carries the logo
// and no title; column 4 groups its title with the social row, then the link
// list, and pins its tail to the column bottom (`align=SPACE_BETWEEN`).
interface FooterColumn {
  /** Column heading (source Label & Caption). */
  title?: React.ReactNode
  /** Places the `brand` slot in the first column. */
  brand?: boolean
  /** Source `Social link`: the title's artwork row. */
  social?: FooterSocialLink[]
  /** Link rows of the column; rendered when it has no `social`/`end`. */
  links?: FooterLink[]
  /** Source tail slot of the column, e.g. the EU badge. */
  end?: React.ReactNode
}

function FooterLinkRow({ link }: { link: FooterLink }) {
  const Link = useLinkComponent()
  const hasArtwork = Boolean(link.icon) || Boolean(link.trailing)
  return (
    <Link
      href={link.href}
      aria-current={link.current ? "page" : undefined}
      className={cn(
        "relative flex w-fit items-center gap-0.5 rounded-sm text-label-mini-sb text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
        // The source rows are 20px (text) or 24px (with the language chevron);
        // the invisible `::after` keeps a 44px pointer target on both.
        "after:absolute after:inset-x-0",
        hasArtwork ? "after:-inset-y-2.5" : "after:-inset-y-3",
      )}
    >
      {link.icon ? (
        <span aria-hidden="true" className="flex shrink-0 items-center [&>svg]:size-6">
          {link.icon}
        </span>
      ) : null}
      {link.label}
      {link.trailing ? (
        <span aria-hidden="true" className="flex shrink-0 items-center [&>svg]:size-6">
          {link.trailing}
        </span>
      ) : null}
    </Link>
  )
}

function Footer({
  brand: brandProp,
  homeHref = "#",
  links = [],
  company = COMPANY_INFORMATION,
  columns = [],
  titleAs = "h2",
  columnsLabel: columnsLabelProp,
  className,
}: {
  /** Brand slot of the footer. @default messages.footer.brand */
  brand?: React.ReactNode
  /** Link target of the brand; the `#` placeholder keeps the source default. @default "#" */
  homeHref?: string
  /** Compact band links (source Logged user=True). */
  links?: FooterLink[]
  /** Company-information sentence of the bottom band. @default the source legal copy */
  company?: React.ReactNode
  /** Source Logged user=False: the white `Links` block above the company band. */
  columns?: FooterColumn[]
  /** Heading tag of the column titles. @default "h2" */
  titleAs?: HeadingTag
  /** Accessible name of the columns navigation. @default messages.footer.columnsLabel */
  columnsLabel?: string
  /** ClassName applied to the footer element. */
  className?: string
}) {
  const t = useMessages("footer")
  const brand = brandProp ?? t.brand
  const columnsLabel = columnsLabelProp ?? t.columnsLabel

  const Link = useLinkComponent()
  return (
    <footer className={cn("border-t border-border bg-background", className)}>
      {/* The two source anatomies are alternatives: columns replace the band. */}
      {links.length && !columns.length ? (
        // Source `Logged user=True, Device=Mobile` (1360:12618): a 32px gap
        // between the centred brand and the centred link stack, 16px apart,
        // with the source 20px rows (the 44px target is the invisible `::after`).
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-6 py-6 tablet:flex-row tablet:flex-nowrap tablet:items-center tablet:justify-between tablet:gap-6">
          <Link
            href={homeHref}
            className="rounded-sm text-title-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {brand}
          </Link>
          {/* Source desktop band: one row where a long label wraps inside its
              own item (the 900px page band is 44px tall for that reason). */}
          <ul className="flex min-w-0 flex-col items-center gap-4 tablet:flex-row tablet:flex-nowrap tablet:items-center tablet:gap-6">
            {links.map((link) => (
              <li key={link.href} className="min-w-0">
                <FooterLinkRow link={link} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {columns.length ? (
        // Source `Links` block: white surface, pad 64/132 at 1200, four 216px
        // columns 24px apart; pad 64/24 with the same columns from the tablet
        // source, stacked at the 40px mobile gap below the container breakpoint.
        // The wrapper is the query container: an element cannot query itself.
        <div className="@container/footer">
          <nav
            aria-label={columnsLabel}
            className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-6 @4xl/footer:grid @4xl/footer:grid-cols-4 @4xl/footer:gap-6 @4xl/footer:py-16 @6xl/footer:px-33"
          >
            {columns.map((column, index) => (
              <div
                key={typeof column.title === "string" ? column.title : index}
                data-slot="footer-column"
                className="flex min-w-0 flex-col gap-4"
              >
                {column.brand ? (
                  <Link
                    href={homeHref}
                    className="mb-2 w-fit rounded-sm text-title-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {brand}
                  </Link>
                ) : null}
                {column.title ? (
                  <Heading as={titleAs} className="text-label-overline text-muted-foreground">
                    {column.title}
                  </Heading>
                ) : null}
                {column.social?.length ? (
                  <ul data-slot="footer-social" className="mb-4 flex flex-wrap gap-8">
                    {column.social.map((social) => (
                      <li key={social.href}>
                        <Link
                          href={social.href}
                          aria-label={social.label}
                          className="relative flex size-6 items-center justify-center rounded-sm text-foreground after:absolute after:-inset-2.5 focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                          <span
                            aria-hidden="true"
                            className="flex shrink-0 items-center [&>svg]:size-6"
                          >
                            {social.icon}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {column.links?.length ? (
                  // Columns 1-3 keep the source 32px inset, so the labels wrap at
                  // the source 184px (column 4 shares it: its labels are shorter).
                  <ul data-slot="footer-links" className="flex flex-col gap-4 pr-8">
                    {column.links.map((link) => (
                      <li key={link.href}>
                        <FooterLinkRow link={link} />
                      </li>
                    ))}
                  </ul>
                ) : null}
                {/* The tail is hidden while empty, so the caller owns the slot
                  without paying for the column's gap. */}
                <div className="mt-6 empty:hidden @4xl/footer:mt-auto @4xl/footer:pt-4">
                  {column.end}
                </div>
              </div>
            ))}
          </nav>
        </div>
      ) : null}
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <p className="text-center text-label-mini text-muted-foreground">{company}</p>
        </div>
      </div>
    </footer>
  )
}

export { Footer }
export type { FooterColumn, FooterLink, FooterSocialLink }
