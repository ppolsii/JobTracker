import type { Metadata } from "next";
import { Mail } from "lucide-react";

import { ROUTES } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { buildCanonicalUrl } from "@/features/marketing/utils/seo";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";

const TITLE = "Contact";
const DESCRIPTION = `Get in touch with the ${siteConfig.name} team.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: buildCanonicalUrl(ROUTES.CONTACT) },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: buildCanonicalUrl(ROUTES.CONTACT),
    type: "website",
  },
};

// A direct mailto: link, not a contact form - this application has no
// email-sending infrastructure, and a form that silently goes nowhere would
// be worse than an honest, working email link.
export default function ContactPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{TITLE}</h1>
      <p className="text-muted-foreground">
        Questions, feedback, or need help with your account? We&apos;d love
        to hear from you.
      </p>

      <Card className="mx-auto w-fit">
        <CardContent className="flex flex-col items-center gap-4 p-8">
          <Mail className="size-8 text-primary" aria-hidden="true" />
          <Button
            size="lg"
            nativeButton={false}
            render={<a href={`mailto:${siteConfig.supportEmail}`} />}
          >
            {siteConfig.supportEmail}
          </Button>
          <p className="text-xs text-muted-foreground">
            We typically reply within 1-2 business days.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
