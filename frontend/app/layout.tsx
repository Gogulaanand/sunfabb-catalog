import type { Metadata } from 'next';
import { DM_Sans, Manrope, Space_Mono } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { GoogleAnalytics } from '@next/third-parties/google';
import { OrganizationSchema } from '@/components/seo/OrganizationSchema';
import {
  HIDE_TEST_IMAGES,
  SITE_URL,
  SOCIAL_PREVIEW_IMAGE,
} from '@/lib/site-config';
import './globals.css';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  display: 'swap',
});

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  display: 'swap',
});

const spaceMono = Space_Mono({
  variable: '--font-space-mono',
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    template: '%s | Sunfabb',
    default: 'Sunfabb - Bedspreads, Towels & Table Linen from India',
  },
  description:
    'Browse Sunfabb bedspreads, towels, napkins and table linen from India.',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Sunfabb',
    images: [SOCIAL_PREVIEW_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    images: [SOCIAL_PREVIEW_IMAGE.url],
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
      className={`${dmSans.variable} ${manrope.variable} ${spaceMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        {!HIDE_TEST_IMAGES && (
          <link rel="preconnect" href="https://images.unsplash.com" />
        )}
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
