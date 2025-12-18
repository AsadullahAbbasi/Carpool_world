'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function ThemeToggle({ variant = 'ghost', size = 'icon', className }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch by only rendering after mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = (resolvedTheme ?? theme) as 'light' | 'dark' | undefined;

  const toggleTheme = () => {
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  if (!mounted) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn('relative overflow-hidden', className)}
        disabled
      >
        <div className="flex items-center justify-center w-full h-full">
          <div className="w-4 h-4 rounded-full bg-muted animate-pulse" />
        </div>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={cn(
        'relative overflow-hidden',
        'border-0 bg-transparent shadow-none',
        'text-foreground hover:bg-transparent hover:text-foreground',
        'transition-none duration-0',
        'active:scale-100',
        'focus-visible:ring-0 focus-visible:ring-offset-0',
        className
      )}
      aria-label={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative flex items-center justify-center w-full h-full">
        {/* Sun Icon */}
        <Sun
          className={cn(
            'absolute h-4 w-4 transition-none duration-0',
            currentTheme === 'light'
              ? 'rotate-0 scale-100 opacity-100'
              : 'rotate-180 scale-0 opacity-0'
          )}
        />

        {/* Moon Icon */}
        <Moon
          className={cn(
            'absolute h-4 w-4 transition-none duration-0',
            currentTheme === 'dark'
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-180 scale-0 opacity-0'
          )}
        />
      </div>

    </Button>
  );
}






