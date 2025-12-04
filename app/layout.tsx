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
    default: 'RideShare - Carpool App',
    template: '%s | RideShare',
  },
  description: 'Affordable and safe carpooling for university students in Pakistan. Connect, share, and travel together.',
  keywords: ['carpool', 'ride share', 'university rides', 'cheap rides', 'student transport', 'Pakistan'],
  authors: [{ name: 'RideShare Team' }],
  creator: 'RideShare',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RideShare',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://rideshare.com',
    title: 'RideShare - Carpool App',
    description: 'Affordable and safe carpooling for university students in Pakistan.',
    siteName: 'RideShare',
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
              name: 'RideShare',
              url: 'https://rideshare.com',
              logo: 'https://rideshare.com/icon-512x512.png',
              description: 'Affordable and safe carpooling for university students in Pakistan.',
              sameAs: [
                'https://facebook.com/rideshare',
                'https://twitter.com/rideshare',
                'https://instagram.com/rideshare',
              ],
            }),
          }}
        />
      </body>
    </html>
  );
}