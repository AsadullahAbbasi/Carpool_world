'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { profileApi } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User as UserIcon, LogIn, Menu, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import ProfileDialog from './ProfileDialog';

interface NavbarProps {
  onLogout: () => void;
  isAuthenticated?: boolean; // Whether user is logged in
}

const Navbar = ({ onLogout, isAuthenticated = true }: NavbarProps) => {
  const router = useRouter();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    } else {
      // Clear profile when user logs out
      setProfile(null);
    }
  }, [isAuthenticated]);

  const fetchProfile = async () => {
    try {
      const { profile: profileData } = await profileApi.getProfile();
      if (profileData) {
        setProfile({
          full_name: profileData.fullName || '',
          avatar_url: profileData.avatarUrl || null,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  return (
    <>
      <nav className="bg-card border-b border-border shadow-soft sticky top-0 z-50 backdrop-blur-sm bg-card/95">
        {/* Mobile-first: responsive padding and sizing */}
        <div className="container mx-auto px-[1rem] py-[0.75rem] flex items-center justify-between sm:px-[1.5rem] sm:py-[1rem]">
          <div className="flex min-w-0 items-center gap-[0.75rem] sm:gap-[1rem]">
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
            {/* Fluid text: scales from 1.25rem to 1.5rem */}
            <span className="text-[15px] min-w-0 truncate font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent  leading-none sm:text-[clamp(1.25rem,2.5vw+0.75rem,1.5rem)]">
              RideShare
            </span>
          </div>

          <div className="flex flex-shrink-0 items-center gap-[0.5rem] sm:gap-[1rem]">
            {isAuthenticated ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full p-0 h-auto min-h-0 min-w-0">
                      <Avatar className="w-[2.75rem] h-[2.75rem] cursor-pointer sm:w-[2.5rem] sm:h-[2.5rem]">
                        <AvatarImage src={profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary text-base sm:text-sm">
                          {profile?.full_name?.charAt(0).toUpperCase() || <UserIcon className="w-[1.25rem] h-[1.25rem] sm:w-[1rem] sm:h-[1rem]" />}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setProfileDialogOpen(true)} className="cursor-pointer">
                      <UserIcon className="w-[1.25rem] h-[1.25rem] mr-[0.5rem] sm:w-[1rem] sm:h-[1rem]" />
                      Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onLogout} className="cursor-pointer">
                      <LogOut className="w-[1.25rem] h-[1.25rem] mr-[0.5rem] sm:w-[1rem] sm:h-[1rem]" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <ThemeToggle />
              </>
            ) : (
              <>
                <ThemeToggle />
                {/* Desktop: show Sign In button normally */}
                <Button onClick={() => router.push('/auth')} size="sm" className="hidden sm:inline-flex">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>

                {/* Mobile: simple dropdown menu (no sidebar) */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="sm:hidden"
                  onClick={() => setMobileMenuOpen((v) => !v)}
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu content (logged-out only) */}
        {!isAuthenticated && mobileMenuOpen && (
          <div className="sm:hidden border-t border-border">
            <div className="container mx-auto px-[1rem] py-[0.75rem]">
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push('/auth');
                  }}
                  className="w-full"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push('/auth?mode=signup');
                  }}
                  className="w-full"
                >
                  Sign Up
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {isAuthenticated && (
        <ProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} onProfileUpdate={fetchProfile} />
      )}
    </>
  );
};

export default Navbar;
