import { TESTIMONIAL_PLACEHOLDERS } from "@/features/marketing/constants/marketing.constants";
import { Card, CardContent } from "@/shared/components/ui/card";

// "Testimonials placeholder": deliberately generic - see
// marketing.constants.ts's own note on why these are role-labeled
// placeholders, not fabricated names/companies presented as real reviews.
export function TestimonialsSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="mb-10 text-center text-3xl font-semibold tracking-tight">
        What job seekers are saying
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TESTIMONIAL_PLACEHOLDERS.map((testimonial, index) => (
          <Card key={index}>
            <CardContent className="flex flex-col gap-3 p-6">
              <p className="text-sm text-muted-foreground italic">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <p className="text-sm font-medium">{testimonial.role}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
