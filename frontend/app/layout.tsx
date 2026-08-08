import type { Metadata } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { GoogleAnalytics } from '@next/third-parties/google';
import { OrganizationSchema } from '@/components/seo/OrganizationSchema';
import { SITE_URL } from '@/lib/site-config';
import './globals.css';

const playfairDisplay = Playfair_Display({
  variable: '--font-playfair-display',
  subsets: ['latin'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
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
    images: [
      {
        url: '/images/home/sunfabb-hero-option-a.png',
        width: 1672,
        height: 941,
        alt: 'Sunfabb home textiles',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/images/home/sunfabb-hero-option-a.png'],
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
