import { FeatureIcon } from "@/features/marketing/components/FeatureIcon";
import type { FeatureHighlight } from "@/features/marketing/constants/marketing.constants";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

// "FEATURE HIGHLIGHTS" (Home) / "FEATURES" (the dedicated Features page) -
// one reusable grid, parameterized by which features and how much intro
// copy to show, rather than two near-duplicate components.
export function FeatureHighlightsSection({
  heading,
  description,
  features,
}: {
  heading: string;
  description?: string;
  features: FeatureHighlight[];
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight">{heading}</h2>
        {description ? (
          <p className="mt-3 text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.key}>
            <CardHeader className="flex flex-row items-start gap-3">
              <FeatureIcon
                featureKey={feature.key}
                className="mt-0.5 size-5 shrink-0 text-primary"
              />
              <div className="flex flex-1 items-center justify-between gap-2">
                <CardTitle className="text-base">{feature.title}</CardTitle>
                {feature.pro ? <Badge variant="secondary">Pro</Badge> : null}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
