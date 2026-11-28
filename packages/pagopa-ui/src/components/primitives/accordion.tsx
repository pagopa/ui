"use client"

import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"
import { cn } from "@/lib/cn"
import { Down as ChevronDown, Up as ChevronUp } from "@/components/icons/generated/chevron"

function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn("pui:flex pui:w-full pui:flex-col", className)}
      {...props}
    />
  )
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("pui:not-last:border-b", className)}
      {...props}
    />
  )
}

function AccordionTrigger({ className, children, ...props }: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="pui:flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group/accordion-trigger pui:relative pui:flex pui:flex-1 pui:items-start pui:justify-between pui:rounded-lg pui:border pui:border-transparent pui:py-2.5 pui:text-left pui:text-body-sb pui:transition-all pui:outline-none pui:hover:underline pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring pui:aria-disabled:pointer-events-none pui:aria-disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          data-slot="accordion-trigger-icon"
          size={24}
          className="pui:ml-auto pui:pointer-events-none pui:text-primary pui:group-aria-expanded/accordion-trigger:hidden"
        />
        <ChevronUp
          data-slot="accordion-trigger-icon"
          size={24}
          className="pui:ml-auto pui:pointer-events-none pui:hidden pui:text-primary pui:group-aria-expanded/accordion-trigger:inline"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({ className, children, ...props }: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="pui:overflow-hidden pui:text-body pui:data-open:animate-accordion-down pui:data-closed:animate-accordion-up"
      {...props}
    >
      <div
        className={cn(
          "pui:h-(--accordion-panel-height) pui:pt-0 pui:pb-2.5 pui:data-ending-style:h-0 pui:data-starting-style:h-0 pui:[&_a]:underline pui:[&_a]:underline-offset-3 pui:[&_a]:hover:text-foreground pui:[&_p:not(:last-child)]:mb-4",
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
