'use client';

import Auth from '@/components/Auth';
import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api-client';

export default function AuthPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const data: any = await authApi.getCurrentUser();
        if (!cancelled && data?.user) {
          router.replace('/dashboard');
          return;
        }
      } catch {
        // not logged in
      }

      if (!cancelled) setCheckingAuth(false);
    };

    // Check on mount
    check();

    // Also check when user comes back via back button / tab focus
    const handleFocus = () => check();
    const handleVisibilityChange = () => {
      if (!document.hidden) check();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);

  if (checkingAuth) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <Auth />
    </Suspense>
  );
}
