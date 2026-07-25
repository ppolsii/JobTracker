import { FAQ_ITEMS } from "@/features/marketing/constants/marketing.constants";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/shared/components/ui/accordion";

// "FAQ". The same FAQ_ITEMS list also backs this page's FAQPage JSON-LD
// (seo.ts's buildFaqJsonLd) - the visible content and the structured data
// can never drift apart.
export function FaqSection() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h2 className="mb-8 text-center text-3xl font-semibold tracking-tight">
        Frequently asked questions
      </h2>
      <Accordion>
        {FAQ_ITEMS.map((faq, index) => (
          <AccordionItem key={index} value={index}>
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionPanel>{faq.answer}</AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
