'use client';

import { useState, useEffect } from 'react';
import { profileApi } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Car, LogOut, User as UserIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ProfileDialog from './ProfileDialog';

interface NavbarProps {
  onLogout: () => void;
}

const Navbar = ({ onLogout }: NavbarProps) => {
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string; avatar_url: string | null } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

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
          <div className="flex items-center gap-[0.75rem] sm:gap-[1rem]">
            <div className="w-[2.5rem] h-[2.5rem] bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center sm:w-[2.75rem] sm:h-[2.75rem]">
              <Car className="w-[1.5rem] h-[1.5rem] text-primary-foreground sm:w-[1.75rem] sm:h-[1.75rem]" />
            </div>
            {/* Fluid text: scales from 1.25rem to 1.5rem */}
            <span className="font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent text-[clamp(1.25rem,2.5vw+0.75rem,1.5rem)] leading-none">
              RideShare
            </span>
          </div>

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
        </div>
      </nav>

      <ProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} onProfileUpdate={fetchProfile} />
    </>
  );
};

export default Navbar;
