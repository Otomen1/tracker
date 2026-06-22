import withPWA from "@ducanh2912/next-pwa";
import withBundleAnalyzer from "@next/bundle-analyzer";

const securityHeaders = [
  // A05: prevent clickjacking (belt-and-suspenders with CSP frame-ancestors)
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // A05: restrict browser feature access
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // A02: force HTTPS for 2 years, include subdomains
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // A05: prevent cross-origin window handle leaks
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // A05: prevent cross-origin reads of this origin's resources
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // unsafe-inline required for Next.js static export + React hydration
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      // A03: block plugin content (Flash, Java applets)
      "object-src 'none'",
      // A03: prevent base-tag injection attacks
      "base-uri 'self'",
      // A03: prevent form exfiltration to external domains
      "form-action 'self'",
      // A05: prevent this page being framed (CSP equivalent of X-Frame-Options)
      "frame-ancestors 'none'",
      // A02: upgrade any accidental HTTP sub-resource requests to HTTPS
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig = withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    document: "/offline.html",
  },
})({
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
});

export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(nextConfig);
