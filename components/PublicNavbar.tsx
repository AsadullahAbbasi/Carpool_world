'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Car, Menu, X } from 'lucide-react';

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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background/95 backdrop-blur-sm border-b border-border shadow-soft'
          : 'bg-transparent dark:bg-background/95'
      }`}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-foreground rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-background" />
            </div>
            <span className="text-xl font-bold">RideShare</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm font-medium hover:text-foreground/80 transition-colors"
            >
              Browse Rides
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium hover:text-foreground/80 transition-colors"
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
            <Button onClick={() => router.push('/auth')}>
              Sign Up
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-border animate-slide-up">
            <div className="flex flex-col gap-4 pt-4">
              <Link
                href="/dashboard"
                className="text-sm font-medium hover:text-foreground/80 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Browse Rides
              </Link>
              <Link
                href="/dashboard"
                className="text-sm font-medium hover:text-foreground/80 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Communities
              </Link>
              <div className="flex flex-col gap-2 pt-2">
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
                    router.push('/auth');
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

