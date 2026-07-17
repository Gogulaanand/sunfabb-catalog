import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { OrganizationSchema } from "@/components/seo/OrganizationSchema";
import "./globals.css";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sunfabb.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: "%s | Sunfabb",
    default:
      "Sunfabb - Premium Cotton Bedspreads, Towels & Table Linen Online India",
  },
  description:
    "Premium handcrafted home textiles from India. Shop bedspreads, towels, napkins and table linen at Sunfabb.",
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Sunfabb",
  },
  twitter: {
    card: "summary_large_image",
    site: "@sunfabb",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://images.unsplash.com" />
      </head>
      <body className="min-h-full bg-surface text-on-surface font-body">
        <OrganizationSchema />
        {children}
        <SpeedInsights />
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
      </body>
    </html>
  );
}
