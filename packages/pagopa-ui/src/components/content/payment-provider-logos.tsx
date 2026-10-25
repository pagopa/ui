import { cn } from "@/lib/cn"

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

type PaymentProviderLogosProps =
  | {
      brand: PspBrand
      alt?: string
      className?: string
      providers?: never
      label?: never
    }
  | {
      providers: { name: string; logo?: string }[]
      label?: string
      className?: string
      brand?: never
      alt?: never
    }

/**
 * Payment service provider marks: one brand logo, or a labelled list of the
 * caller's providers.
 *
 * Figma: Loghi PSP (node 382:7640)
 */
function PaymentProviderLogos(props: PaymentProviderLogosProps) {
  if (props.brand) {
    const logo = pspBrandLogos[props.brand]
    return (
      <img
        data-psp-brand={props.brand}
        src={logo.src}
        alt={props.alt ?? logo.alt}
        className={cn("size-6 shrink-0", props.className)}
      />
    )
  }

  const { providers, label = "Prestatori di servizi di pagamento", className } = props

  return (
    <ul aria-label={label} className={cn("flex flex-wrap items-center gap-4", className)}>
      {providers.map((provider) => (
        <li
          key={provider.name}
          className="grid min-h-14 min-w-28 place-items-center rounded-lg border bg-background p-3"
        >
          {provider.logo ? (
            <img
              src={provider.logo}
              alt={provider.name}
              className="max-h-8 max-w-24 object-contain"
            />
          ) : (
            <span className="text-label-sb">{provider.name}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export { PaymentProviderLogos }
