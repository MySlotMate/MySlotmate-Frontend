/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // jsdom (used by isomorphic-dompurify to sanitize rich text on the server)
  // reads its own files at runtime and breaks when bundled, so Node loads it.
  serverExternalPackages: ["isomorphic-dompurify", "jsdom"],
  images: {
    domains: [
      "myslotmate.s3.us-east-2.amazonaws.com",
      "myslotmates3.s3.eu-north-1.amazonaws.com",
    ],
  },
  async redirects() {
    return [
      {
        source: "/docs/trust-and-safety/community-guidelines",
        destination: "/support/policies",
        statusCode: 301,
      },
      {
        source: "/docs/trust-and-safety/faqs",
        destination: "/support",
        statusCode: 301,
      },
      {
        source: "/docs/trust-and-safety/security-practices",
        destination: "/support/policies",
        statusCode: 301,
      },
      {
        source: "/docs/company/contact-us",
        destination: "/support",
        statusCode: 301,
      },
      {
        source: "/docs/legal/accessibility-statement",
        destination: "/support/policies",
        statusCode: 301,
      },
      {
        source: "/docs/legal/age-restriction-notice",
        destination: "/support/policies",
        statusCode: 301,
      },
      {
        source: "/docs/legal/privacy-policy-and-data-protection",
        destination: "/support/policies",
        statusCode: 301,
      },
    ];
  },
};

export default config;
