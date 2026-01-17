import { redirect } from 'next/navigation';
import LandingPage from '@/app/(pages)/landing/page';
import { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};


export default function Home() {
  // For now, show landing page to everyone
  // In production, you might want to check auth and redirect authenticated users to dashboard
  return <LandingPage />;
}
