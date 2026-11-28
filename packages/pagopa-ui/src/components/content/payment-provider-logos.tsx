"use client"

import * as React from "react"

import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import amexLogo from "@/assets/psp-logos/382-7441.svg"
import appPostepayLogo from "@/assets/psp-logos/382-7478.svg"
import bancomatPayLogo from "@/assets/psp-logos/382-7451.svg"
import applePayLogo from "@/assets/psp-logos/382-7460.svg"
import dinersLogo from "@/assets/psp-logos/382-7443.svg"
import discoverLogo from "@/assets/psp-logos/382-7445.svg"
import jcbLogo from "@/assets/psp-logos/382-7447.svg"
import maestroLogo from "@/assets/psp-logos/382-7437.svg"
import mastercardLogo from "@/assets/psp-logos/382-7435.svg"
import myBankLogo from "@/assets/psp-logos/382-7469.svg"
import pagoBancomatLogo from "@/assets/psp-logos/382-7458.svg"
import payPalLogo from "@/assets/psp-logos/382-7462.svg"
import satispayLogo from "@/assets/psp-logos/382-7467.svg"
import unionPayLogo from "@/assets/psp-logos/382-7449.svg"
import vPayLogo from "@/assets/psp-logos/382-7483.svg"
import visaLogo from "@/assets/psp-logos/382-7439.svg"

type PspBrand =
  | "mastercard"
  | "maestro"
  | "visa"
  | "amex"
  | "diners"
  | "discover"
  | "jcb"
  | "unionpay"
  | "bancomat-pay"
  | "pagobancomat"
  | "apple-pay"
  | "paypal"
  | "satispay"
  | "mybank"
  | "app-postepay"
  | "vpay"

// The `alt`s are the registered names of the logos: brand marks are not copy,
// they are the same words in every locale, so a literal here is not a message
// the dictionary owns. The `alt` prop of the single-brand variant keeps the
// text contract: it overrides this map.
const pspBrandLogos: Record<PspBrand, { src: string; alt: string }> = {
  mastercard: { src: mastercardLogo, alt: "Mastercard" },
  maestro: { src: maestroLogo, alt: "Maestro" },
  visa: { src: visaLogo, alt: "Visa" },
  amex: { src: amexLogo, alt: "Amex" },
  diners: { src: dinersLogo, alt: "Diners" },
  discover: { src: discoverLogo, alt: "Discover" },
  jcb: { src: jcbLogo, alt: "JCB" },
  unionpay: { src: unionPayLogo, alt: "UnionPay" },
  "bancomat-pay": { src: bancomatPayLogo, alt: "BANCOMAT Pay" },
  pagobancomat: { src: pagoBancomatLogo, alt: "PagoBANCOMAT" },
  "apple-pay": { src: applePayLogo, alt: "Apple Pay" },
  paypal: { src: payPalLogo, alt: "PayPal" },
  satispay: { src: satispayLogo, alt: "Satispay" },
  mybank: { src: myBankLogo, alt: "MyBank" },
  "app-postepay": { src: appPostepayLogo, alt: "App Postepay" },
  vpay: { src: vPayLogo, alt: "vPay" },
}

// One mark or a list of them: the two shapes render different elements, so each
// branch inherits the contract of the element it renders.
type PaymentProviderLogosProps =
  | (Omit<React.ComponentProps<"img">, "src" | "alt"> & {
      brand: PspBrand
      alt?: string
      providers?: never
      label?: never
    })
  | (Omit<React.ComponentProps<"ul">, "children"> & {
      providers: { name: string; logo?: string }[]
      /** Accessible name of the logo list. @default messages.paymentProviderLogos.label */
      label?: string
      brand?: never
      alt?: never
    })

/**
 * Payment service provider marks: one brand logo, or a labelled list of the
 * caller's providers.
 *
 * Figma: Loghi PSP (node 382:7640)
 */
function PaymentProviderLogos(props: PaymentProviderLogosProps) {
  const t = useMessages("paymentProviderLogos")
  if (props.brand) {
    const { brand, alt, className, ref, ...rest } = props
    const logo = pspBrandLogos[brand]
    return (
      <img
        {...rest}
        ref={ref}
        data-slot="payment-provider-logos"
        data-psp-brand={brand}
        src={logo.src}
        alt={alt ?? logo.alt}
        className={cn("pui:size-6 pui:shrink-0", className)}
      />
    )
  }

  const { providers, label: labelProp, className, ref, ...rest } = props
  const label = labelProp ?? t.label

  return (
    <ul
      {...rest}
      ref={ref}
      data-slot="payment-provider-logos"
      aria-label={label}
      className={cn("pui:flex pui:flex-wrap pui:items-center pui:gap-4", className)}
    >
      {providers.map((provider) => (
        <li
          key={provider.name}
          className="pui:grid pui:min-h-14 pui:min-w-28 pui:place-items-center pui:rounded-lg pui:border pui:bg-background pui:p-3"
        >
          {provider.logo ? (
            <img
              src={provider.logo}
              alt={provider.name}
              className="pui:max-h-8 pui:max-w-24 pui:object-contain"
            />
          ) : (
            <span className="pui:text-label-sb">{provider.name}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export { PaymentProviderLogos }
export type { PaymentProviderLogosProps, PspBrand }
