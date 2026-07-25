import type { NextConfig } from "next";

// Production Readiness Audit (IMPLEMENTATION_ORDER_V2.md Phase 39):
// "Headers." These five are uncontroversial, low-risk, framework-agnostic
// hardening headers with no impact on how the app itself renders or
// behaves - unlike a Content-Security-Policy (deliberately not added here;
// see the Production Audit Report's own note on why a strict CSP needs
// live-browser verification this environment cannot perform before it's
// safe to ship).
const securityHeaders = [
  // Prevents this app from being framed by another site (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  // Stops the browser from MIME-sniffing a response away from its
  // declared Content-Type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Only sends the full referrer to same-origin requests; cross-origin
  // requests get just the origin, never the full path/query.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disables browser features this app never uses.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Forces HTTPS for a year, including subdomains. Harmless in local dev
  // (browsers only honor it over a real HTTPS connection).
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
