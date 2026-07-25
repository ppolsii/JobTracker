export const siteConfig = {
  name: "JobTracker Insights",
  description:
    "A job search analytics platform that turns your application history into actionable insights.",
  // Phase 37 (Landing Page & Marketing Website) - the Contact page's only
  // real contact method. This app has no email-sending infrastructure (no
  // provider like Resend/SendGrid anywhere in the codebase), so Contact is
  // an honest mailto: link rather than a form that would silently go
  // nowhere.
  supportEmail: "support@jobtrackerinsights.com",
} as const;
