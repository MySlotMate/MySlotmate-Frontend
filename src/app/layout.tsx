import "~/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { Geist } from "next/font/google";
import Providers from "~/components/Providers";
import Preloader from "~/components/Preloader";
import { Toaster } from "sonner";

const appUrl = "https://www.myslotmate.com";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "MySlotMate - Book Unique Experiences with Amazing Hosts",
    template: "%s | MySlotMate",
  },
  description:
    "Discover and book unique experiences with expert hosts. Learn new skills, meet interesting people, and create unforgettable memories. Join MySlotMate today!",
  keywords: [
    "experiences",
    "book experiences",
    "unique activities",
    "host experiences",
    "learn skills",
    "meet people",
    "local experiences",
    "adventure booking",
    "skill sharing",
  ],
  applicationName: "MySlotMate",
  creator: "MySlotMate Team",
  publisher: "MySlotMate",
  authors: [{ name: "MySlotMate Team", url: "https://myslotmate.com" }],
  generator: "Next.js",
  
  /* Open Graph Tags */
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appUrl,
    siteName: "MySlotMate",
    title: "MySlotMate - Book Unique Experiences with Amazing Hosts",
    description:
      "Discover and book unique experiences with expert hosts. Learn new skills, meet interesting people, and create unforgettable memories.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "MySlotMate - Book Unique Experiences",
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
    title: "MySlotMate - Book Unique Experiences with Amazing Hosts",
    description:
      "Discover and book unique experiences with expert hosts. Learn new skills, meet interesting people, and create unforgettable memories.",
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
  
  /* Verification Tags */
  verification: {
    google: "google-site-verification-code",
    yandex: "yandex-verification-code",
  },

  /* Icons */
  icons: {
    icon: [
      { url: "/assets/home/logomyslotmate.png", sizes: "any" }
    ],
    apple: "/apple-touch-icon.png",
    other: [
      {
        rel: "icon",
        url: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        rel: "icon",
        url: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
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
  themeColor: "#0094CA",
  colorScheme: "light",
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  /* JSON-LD Structured Data */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "MySlotMate",
    description:
      "A platform to discover and book unique experiences with amazing hosts",
    url: appUrl,
    applicationCategory: "Entertainment",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      availability: "InStock",
    },
    creator: {
      "@type": "Organization",
      name: "MySlotMate",
      url: appUrl,
      logo: "/assets/home/logomyslotmate.png",
      sameAs: [
        "https://www.instagram.com/myslotmate/",
      ],
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${appUrl}/experiences?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en" className={`${geist.variable} overflow-x-hidden max-w-screen`} suppressHydrationWarning>
      <head>
        {/* JSON-LD Schema Markup */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Preconnect for Performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Display font used in hero/preloader (removed) */}

        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="https://analytics.google.com" />

        {/* Canonical URL */}
        <link rel="canonical" href={appUrl} />

        {/* Additional Meta Tags for SEO */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MySlotMate" />
      </head>
      <body className="overflow-x-hidden max-w-screen">
        <Preloader />
        <Providers>{children}</Providers>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}

