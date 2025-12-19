'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { authApi } from '@/lib/api-client';

const PublicNavbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const navLinkClass =
    'relative text-base font-medium text-foreground/80 transition-colors hover:text-foreground sm:text-sm ' +
    'after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-current ' +
    'after:transition-transform after:duration-300 hover:after:scale-x-100 focus-visible:after:scale-x-100';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    // Ensure correct initial style (no "tiny scroll" needed)
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const checkAuthStatus = async () => {
      try {
        const data: any = await authApi.getCurrentUser();
        if (!cancelled && data?.user) {
          setIsAuthenticated(true);
          return;
        }
      } catch {
        // not logged in
      }

      if (!cancelled) setIsAuthenticated(false);
    };

    // Check on mount + when tab regains focus (handles back button)
    checkAuthStatus();

    const handleFocus = () => checkAuthStatus();
    const handleVisibilityChange = () => {
      if (!document.hidden) checkAuthStatus();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-xl backdrop-saturate-150 bg-background/60 dark:bg-muted/50 ${scrolled ? 'border-b border-border shadow-soft bg-background/90 dark:bg-muted/90' : ''
        }`}
    >
      {/* Mobile-first: responsive padding */}
      <div className="container mx-auto px-[1rem] py-[0.75rem] sm:px-[1.5rem] sm:py-[1rem]">
        <div className="flex items-center justify-between">
          {/* Logo - Mobile-first sizing */}
          {/* Logo - Mobile-first sizing */}
          <div
            onClick={() => {
              if (isAuthenticated) {
                router.push('/dashboard?tab=rides');
              } else {
                router.push('/');
              }
            }}
            className="flex items-center gap-[0.5rem] sm:gap-[0.75rem] cursor-pointer"
          >
            <div className="w-[2.5rem] h-[2.5rem] relative flex items-center justify-center sm:w-[2.75rem] sm:h-[2.75rem]">
              {/* Light mode */}
              <Image
                src="/RideShare_Logo.png"
                alt="RideShare Logo"
                width={44}
                height={44}
                className="w-full h-full object-contain dark:hidden"
                priority
              />
              {/* Dark mode */}
              <Image
                src="/nightLogo.png"
                alt="RideShare Logo"
                width={44}
                height={44}
                className="w-full h-full object-contain hidden dark:block"
                priority
              />
            </div>
            {/* Fluid text scaling */}
            <span className="font-bold text-[clamp(1.125rem,2vw+0.625rem,1.25rem)] leading-none">RideShare</span>
          </div>

          {/* Desktop links + actions (right) */}
          <div className="hidden md:flex items-center gap-[1.5rem]">
            <Link href="/dashboard?tab=rides" className={navLinkClass}>
              Browse Rides
            </Link>
            <Link href="/dashboard?tab=communities" className={navLinkClass}>
              Communities
            </Link>
            {!isAuthenticated && (
              <>
                <Link href="/auth" className={navLinkClass}>
                  Sign In
                </Link>
                <Link href="/auth?mode=signup" className={navLinkClass}>
                  Sign Up
                </Link>
              </>
            )}
            <ThemeToggle />
          </div>

          {/* Mobile actions (theme + menu button) */}
          <div className="md:hidden flex items-center gap-[0.5rem]">
            <ThemeToggle />
            <button
              className="p-[0.5rem] min-h-[2.75rem] min-w-[2.75rem] flex items-center justify-center"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-[1.5rem] h-[1.5rem]" />
              ) : (
                <Menu className="w-[1.5rem] h-[1.5rem]" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div
            className={`md:hidden mt-[1rem] pb-[1rem] animate-slide-up border-t-2 border-border/70 ${scrolled ? '' : 'border-b-2'
              }`}
          >
            <div className="flex flex-col items-center text-center gap-[1rem] pt-[1rem]">
              <Link
                href="/dashboard?tab=rides"
                className="text-base font-medium text-foreground/80 hover:text-foreground transition-colors min-h-[2.75rem] w-full flex items-center justify-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Browse Rides
              </Link>
              <Link
                href="/dashboard?tab=communities"
                className="text-base font-medium text-foreground/80 hover:text-foreground transition-colors min-h-[2.75rem] w-full flex items-center justify-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Communities
              </Link>
              {!isAuthenticated && (
                <>
                  <Link
                    href="/auth"
                    className="text-base font-medium text-foreground/80 hover:text-foreground transition-colors min-h-[2.75rem] w-full flex items-center justify-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth?mode=signup"
                    className="text-base font-medium text-foreground/80 hover:text-foreground transition-colors min-h-[2.75rem] w-full flex items-center justify-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default PublicNavbar;
