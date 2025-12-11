'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

const PublicNavbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
          ? 'bg-background/95 backdrop-blur-sm border-b border-border shadow-soft'
          : 'bg-transparent dark:bg-background/95'
        }`}
    >
      {/* Mobile-first: responsive padding */}
      <div className="container mx-auto px-[1rem] py-[0.75rem] sm:px-[1.5rem] sm:py-[1rem]">
        <div className="flex items-center justify-between">
          {/* Logo - Mobile-first sizing */}
          <Link href="/" className="flex items-center gap-[0.5rem] sm:gap-[0.75rem]">
            <div className="w-[2.5rem] h-[2.5rem] relative flex items-center justify-center sm:w-[2.75rem] sm:h-[2.75rem]">
              <Image 
                src="/RideShare_Logo.png" 
                alt="RideShare Logo" 
                width={44}
                height={44}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            {/* Fluid text scaling */}
            <span className="font-bold text-[clamp(1.125rem,2vw+0.625rem,1.25rem)] leading-none">RideShare</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-[1.5rem]">
            <Link
              href="/dashboard?tab=rides"
              className="text-base font-medium hover:text-foreground/80 transition-colors sm:text-sm"
            >
              Browse Rides
            </Link>
            <Link
              href="/dashboard?tab=communities"
              className="text-base font-medium hover:text-foreground/80 transition-colors sm:text-sm"
            >
              Communities
            </Link>
            <Button
              variant="ghost"
              onClick={() => router.push('/auth')}
              className="hover:bg-foreground/10 hover:text-foreground"
            >
              Sign In
            </Button>
            <Button onClick={() => router.push('/auth?mode=signup')}>
              Sign Up
            </Button>
          </div>

          {/* Mobile Menu Button - Touch-friendly */}
          <button
            className="md:hidden p-[0.5rem] min-h-[2.75rem] min-w-[2.75rem] flex items-center justify-center"
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

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-[1rem] pb-[1rem] border-t border-border animate-slide-up">
            <div className="flex flex-col gap-[1rem] pt-[1rem]">
              <Link
                href="/dashboard?tab=rides"
                className="text-base font-medium hover:text-foreground/80 transition-colors min-h-[2.75rem] flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Browse Rides
              </Link>
              <Link
                href="/dashboard?tab=communities"
                className="text-base font-medium hover:text-foreground/80 transition-colors min-h-[2.75rem] flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Communities
              </Link>
              <div className="flex flex-col gap-[0.5rem] pt-[0.5rem]">
                <Button
                  variant="outline"
                  onClick={() => {
                    router.push('/auth');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => {
                    router.push('/auth?mode=signup');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full"
                >
                  Sign Up
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default PublicNavbar;
