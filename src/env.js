import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    GOOGLE_SITE_VERIFICATION: z.string().optional(),
    YANDEX_VERIFICATION: z.string().optional(),
    // Node API base (no /api/v1). Its /home feed decides the Featured rail,
    // the same one the mobile app shows. Unset: web picks Featured itself.
    NODE_API_URL: z.string().url().optional(),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_API_URL: z.string(),
    NEXT_PUBLIC_ADMIN_EMAIL: z.string(),
    NEXT_PUBLIC_GEMINI_API_KEY: z.string().optional(),
    // "true" once the backend serves /hosts/{id}/tax-profile: hosts must add
    // a PAN before withdrawing (Payout and tax spec).
    NEXT_PUBLIC_REQUIRE_TAX_PROFILE: z.enum(["true", "false"]).optional(),
    // Marketing Boost and weekly (50% early) payouts. Unset: on in
    // development, off in production until the backend serves them.
    NEXT_PUBLIC_ENABLE_BOOST: z.enum(["true", "false"]).optional(),
    NEXT_PUBLIC_ENABLE_WEEKLY_PAYOUTS: z.enum(["true", "false"]).optional(),
    // Google Places key for host event location search (src/lib/placeSearch.ts).
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    GOOGLE_SITE_VERIFICATION: process.env.GOOGLE_SITE_VERIFICATION,
    YANDEX_VERIFICATION: process.env.YANDEX_VERIFICATION,
    NODE_API_URL: process.env.NODE_API_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_ADMIN_EMAIL: process.env.NEXT_PUBLIC_ADMIN_EMAIL,
    NEXT_PUBLIC_GEMINI_API_KEY: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    NEXT_PUBLIC_REQUIRE_TAX_PROFILE:
      process.env.NEXT_PUBLIC_REQUIRE_TAX_PROFILE,
    NEXT_PUBLIC_ENABLE_BOOST: process.env.NEXT_PUBLIC_ENABLE_BOOST,
    NEXT_PUBLIC_ENABLE_WEEKLY_PAYOUTS:
      process.env.NEXT_PUBLIC_ENABLE_WEEKLY_PAYOUTS,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
