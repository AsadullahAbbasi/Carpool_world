import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { Providers } from './providers';
import InstallPrompt from '@/components/InstallPrompt';
import BottomNav from '@/components/BottomNav';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: 'RideSharee - Rideshare App',
    template: '%s | RideSharee',
  },
  description: 'Affordable and safe ridesharing for university students in Pakistan. Connect, share, and travel together.',
  keywords: ['ridesharee', 'ride share', 'university rides', 'cheap rides', 'student transport', 'Pakistan'],
  authors: [{ name: 'RideSharee Team' }],
  creator: 'RideSharee',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RideSharee',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://ridesharee.com',
    title: 'RideSharee - Rideshare App',
    description: 'Affordable and safe ridesharing for university students in Pakistan.',
    siteName: 'RideSharee',
    images: [
      {
        url: '/RideShare_Logo.png',
        width: 1200,
        height: 630,
        alt: 'RideSharee Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RideSharee - Rideshare App',
    description: 'Affordable and safe ridesharing for university students in Pakistan.',
    images: ['/RideShare_Logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="grid-background" aria-hidden="true" />
        <div className="content-layer">
          <Providers>
            {children}
            <BottomNav />
            <InstallPrompt />
            <Toaster />
            <Sonner />
          </Providers>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'RideSharee',
                url: 'https://ridesharee.com',
                logo: 'https://ridesharee.com/RideShare_Logo.png',
                description: 'Affordable and safe ridesharing for university students in Pakistan.',
                sameAs: [
                  'https://facebook.com/ridesharee',
                  'https://twitter.com/ridesharee',
                  'https://instagram.com/ridesharee',
                ],
              }),
            }}
          />
        </div>
      </body>
    </html>
  );
}