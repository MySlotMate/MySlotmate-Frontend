import "../styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { Geist, Inter, Manrope, Outfit } from "next/font/google";
import Providers from "~/components/Providers";
import AppSidebar from "~/components/home/AppSidebar";
import AuthGate from "~/components/AuthGate";
import { env } from "~/env";
import { Toaster } from "sonner";
import { AlertTriangle, Check, Info, Loader2, X } from "lucide-react";

const appUrl = "https://www.myslotmate.com";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "MySlotMate | Events & Things to Do in Northeast India",
    template: "%s | MySlotMate",
  },
  description:
    "Workshops, open mics, meetups, treks and one-on-one sessions in Guwahati, Shillong and across Northeast India. Book a slot, or host your own for free.",
  keywords: [
    "events in Guwahati",
    "things to do in Guwahati",
    "things to do in Shillong",
    "events in Northeast India",
    "workshops in Guwahati",
    "open mic Guwahati",
    "meetups near me",
    "weekend activities near me",
    "host an event",
    "host events for free",
    "one-on-one sessions",
    "MySlotMate",
  ],
  applicationName: "MySlotMate",
  creator: "MySlotMate Team",
  publisher: "MySlotMate",
  authors: [{ name: "MySlotMate Team", url: "https://myslotmate.com" }],
  generator: "Next.js",

  /* Open Graph Tags */
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: appUrl,
    siteName: "MySlotMate",
    title: "MySlotMate | Life happens when you show up.",
    description:
      "Events, workshops and meetups across Northeast India, hosted by real people. Find one, step outside, and meet them.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "MySlotMate: events and things to do in Northeast India",
        type: "image/jpeg",
      },
      {
        url: "/og-image-square.jpg",
        width: 800,
        height: 800,
        alt: "MySlotMate",
        type: "image/jpeg",
      },
    ],
  },

  /* Twitter Card Tags */
  twitter: {
    card: "summary_large_image",
    site: "@MySlotMate",
    creator: "@MySlotMate",
    title: "MySlotMate | Life happens when you show up.",
    description:
      "Events, workshops and meetups across Northeast India, hosted by real people. Find one, step outside, and meet them.",
    images: ["/og-image.jpg"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  /* Verification Tags — set GOOGLE_SITE_VERIFICATION / YANDEX_VERIFICATION in env */
  verification: {
    ...(env.GOOGLE_SITE_VERIFICATION && {
      google: env.GOOGLE_SITE_VERIFICATION,
    }),
    ...(env.YANDEX_VERIFICATION && { yandex: env.YANDEX_VERIFICATION }),
  },

  /* Icons — note: NO SVG here. Chrome prefers an image/svg+xml icon over
     everything else, and the brand SVG is a non-square 33×40 glyph that fails to
     render at favicon size (blank/default globe). Square .ico/.png only. */
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  /* Manifest */
  manifest: "/site.webmanifest",

  /* Category */
  category: "Entertainment",

  /* Formats Detection */
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#A020F0",
  colorScheme: "light",
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  /* JSON-LD Structured Data */
  // One graph: the organisation, the site, and where it operates. (No
  // SearchAction: no public page reads a search term from the URL yet.)
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${appUrl}/#organization`,
        name: "MySlotMate",
        url: appUrl,
        logo: `${appUrl}/assets/brand/logo-mark.png`,
        description:
          "MySlotMate is where people across Northeast India find and host events, workshops, meetups and one-on-one sessions.",
        areaServed: [
          "Assam",
          "Meghalaya",
          "Sikkim",
          "Mizoram",
          "Manipur",
          "Nagaland",
          "Arunachal Pradesh",
          "Tripura",
        ].map((name) => ({ "@type": "State", name })),
        sameAs: [
          "https://www.instagram.com/myslotmate/",
          "https://www.linkedin.com/company/myslotmate/",
          "https://x.com/myslotmate",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${appUrl}/#website`,
        name: "MySlotMate",
        url: appUrl,
        inLanguage: "en-IN",
        publisher: { "@id": `${appUrl}/#organization` },
      },
    ],
  };

  return (
    <html
      lang="en"
      className={`${geist.variable} ${manrope.variable} ${outfit.variable} ${inter.variable} max-w-screen overflow-x-clip`}
      suppressHydrationWarning
    >
      <head>
        {/* Google tags (GTM-KCLPRQJC, GTM-KRRPCDX7). Root layout wraps every
            route, so this one copy covers the whole site. Both containers share
            the dataLayer set up below. Keep these first in <head>. */}
        <script
          async
          src="https://www.googletagmanager.com/gtm.js?id=GTM-KCLPRQJC"
        />
        <script
          async
          src="https://www.googletagmanager.com/gtm.js?id=GTM-KRRPCDX7"
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());",
          }}
        />
        {/* Signed-in visitors to "/" get the app feed, which can only render
            after hydration. Flag them before first paint so the public site
            doesn't flash; HomeClient clears the flag once it has mounted. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('msm_user_id'))document.documentElement.dataset.authed='1'}catch(e){}",
          }}
        />
        {/* JSON-LD Schema Markup */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Preconnect for Performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Display font used in hero/preloader (removed) */}

        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="https://analytics.google.com" />

        {/* Additional Meta Tags for SEO */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="MySlotMate" />
      </head>
      <body className="max-w-screen overflow-x-clip bg-[#080914] text-white">
        <Providers>
          <AuthGate />
          <AppSidebar />
          {children}
        </Providers>
        <Toaster
          position="top-right"
          theme="dark"
          closeButton
          gap={10}
          icons={{
            success: (
              <span className="msm-toast-icon msm-toast-icon--success">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            ),
            error: (
              <span className="msm-toast-icon msm-toast-icon--error">
                <X className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            ),
            warning: (
              <span className="msm-toast-icon msm-toast-icon--warning">
                <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
            ),
            info: (
              <span className="msm-toast-icon msm-toast-icon--info">
                <Info className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
            ),
            loading: (
              <span className="msm-toast-icon msm-toast-icon--info">
                <Loader2
                  className="h-3.5 w-3.5 animate-spin"
                  strokeWidth={2.5}
                />
              </span>
            ),
          }}
          toastOptions={{ className: "msm-toast" }}
        />
      </body>
    </html>
  );
}
