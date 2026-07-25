"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"

import { cn } from "@/lib/utils"

// New shared primitive (Phase 37, Landing Page & Marketing Website) - the
// FAQ section is this codebase's first collapsible-list UI - wraps Base
// UI's already-installed accordion (no new dependency), mirroring
// tooltip.tsx/dialog.tsx's own wrapping style exactly.
function Accordion({ ...props }: AccordionPrimitive.Root.Props) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

function AccordionItem({
  className,
  ...props
}: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group flex flex-1 items-center justify-between gap-4 py-4 text-left text-sm font-medium outline-hidden hover:underline focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-open:rotate-180" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionPanel({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-panel"
      className="overflow-hidden text-sm data-ending-style:animate-out data-ending-style:fade-out-0 data-starting-style:animate-in data-starting-style:fade-in-0"
      {...props}
    >
      <div className={cn("pb-4 text-muted-foreground", className)}>
        {children}
      </div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionPanel }
