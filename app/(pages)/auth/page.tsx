'use client';

import Auth from '@/components/Auth';
import { Suspense } from 'react';

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <Auth />
    </Suspense>
  );
}
