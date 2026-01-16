'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { profileApi, storageApi, authApi } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { User, Phone, Upload, Mail } from 'lucide-react';

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdate?: () => void;
  completionMessage?: string;
}

// Zod schema for validation
const profileSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .regex(/^[a-zA-Z0-9\s]+$/, 'Full name can only contain letters, numbers, and spaces'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^[\d\+\s\-\(\)]+$/, 'Invalid phone number format'),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Gender is required',
  }),
  avatarUrl: z.string().optional(),
  nicNumber: z.string().optional(),
  disableAutoExpiry: z.boolean().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const ProfileDialog = ({ open, onOpenChange, onProfileUpdate, completionMessage }: ProfileDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      gender: undefined,
      avatarUrl: '',
      nicNumber: '',
      disableAutoExpiry: false,
    },
  });

  const watchedGender = watch('gender');
  const watchedAvatarUrl = watch('avatarUrl');

  useEffect(() => {
    if (open) {
      setUserEmail('');
      setAvatarUrl('');
      fetchProfile();
    }
  }, [open]);

  const fetchProfile = async () => {
    try {
      // Fetch user email
      try {
        const userData: any = await authApi.getCurrentUser();
        if (userData?.user?.email) {
          setUserEmail(userData.user.email);
        } else {
          setUserEmail('Not available');
        }
      } catch (emailError) {

        setUserEmail('Not available');
      }

      // Fetch profile data
      const { profile } = await profileApi.getProfile();
      if (profile) {
        reset({
          fullName: profile.fullName || '',
          phone: profile.phone || '',
          gender: (profile.gender as 'male' | 'female' | 'other') || undefined,
          avatarUrl: profile.avatarUrl || '',
          nicNumber: profile.nicNumber || '',
          disableAutoExpiry: profile.disableAutoExpiry || false,
        });
        setAvatarUrl(profile.avatarUrl || '');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load profile',
        variant: 'destructive',
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await storageApi.uploadAvatar(file);
      setAvatarUrl(url);
      setValue('avatarUrl', url);
      toast({
        title: 'Avatar uploaded!',
        description: 'Your profile picture has been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload avatar',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    // Validate avatar requirement
    if (data.gender !== 'female' && !data.avatarUrl) {
      toast({
        title: 'Validation Error',
        description: 'Profile picture is required for male and other genders',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    onOpenChange(false);

    try {
      await profileApi.updateProfile({
        fullName: data.fullName,
        phone: data.phone,
        avatarUrl: data.avatarUrl || '',
        gender: data.gender,
        disableAutoExpiry: data.disableAutoExpiry,
      });

      toast({
        title: 'Profile updated!',
        description: 'Your profile has been successfully updated.',
      });
      onProfileUpdate?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
      onOpenChange(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle phone input - prevent numeric increment on scroll/arrow
  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent arrow keys from changing number value
    if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
    }
    // Only allow numbers, +, -, spaces, parentheses
    if (!/[0-9\+\-\(\)\s]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
    }
  };

  // Handle phone wheel scroll - prevent increment
  const handlePhoneWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  // Handle name input - alphanumeric only
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow alphanumeric, spaces, and common editing keys
    if (!/^[a-zA-Z0-9\s]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'].includes(e.key)) {
      e.preventDefault();
    }
  };

  // Handle name input change - filter to alphanumeric only
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^a-zA-Z0-9\s]/g, '');
    setValue('fullName', value, { shouldValidate: true });
  };

  // Handle phone input change - filter to allowed characters
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d\+\s\-\(\)]/g, '');
    setValue('phone', value, { shouldValidate: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your profile information</DialogDescription>
        </DialogHeader>

        {completionMessage && (
          <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200 text-yellow-800 text-sm">
            {completionMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 overflow-y-auto flex-1">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={avatarUrl || watchedAvatarUrl} />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                {watch('fullName')?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <Label htmlFor="avatar" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-md transition-colors">
                <Upload className="w-5 h-5" />
                <span>{uploading ? 'Uploading...' : 'Change Avatar'}</span>
              </div>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
            </Label>
          </div>

          {/* Email - Always visible */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
              <Input
                id="email"
                type="email"
                value={userEmail || 'Loading...'}
                disabled
                readOnly
                className="!pl-12 bg-muted cursor-not-allowed opacity-100"
                placeholder="Your email address"
              />
            </div>
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          {/* Full Name - Alphanumeric only */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
              <Input
                id="fullName"
                placeholder="John Doe"
                {...register('fullName')}
                onChange={handleNameChange}
                onKeyDown={handleNameKeyDown}
                className={`!pl-12 ${errors.fullName ? 'border-destructive' : ''}`}
                required
              />
            </div>
            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
          </div>

          {/* Phone - Prevent numeric increment */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
              <Input
                id="phone"
                type="text"
                inputMode="tel"
                placeholder="03001234567"
                {...register('phone')}
                onChange={handlePhoneChange}
                onKeyDown={handlePhoneKeyDown}
                onWheel={handlePhoneWheel}
                maxLength={15}
                className={`!pl-12 ${errors.phone ? 'border-destructive' : ''}`}
                required
              />
            </div>
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <select
              id="gender"
              {...register('gender')}
              className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${errors.gender ? 'border-destructive' : ''}`}
              required
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
          </div>

          {/* NIC - Read only, numeric only if editable */}
          {watch('nicNumber') && (
            <div className="space-y-2">
              <Label htmlFor="nicNumber">NIC Number</Label>
              <Input
                id="nicNumber"
                value={watch('nicNumber') || ''}
                disabled
                readOnly
                className="bg-muted cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">NIC number is verified and cannot be edited</p>
            </div>
          )}

          {/* Settings Section */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-base font-semibold">Settings</Label>

            {/* Auto-Expiry Toggle */}
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div className="flex-1">
                <Label htmlFor="disableAutoExpiry" className="text-sm font-medium cursor-pointer">
                  Keep my rides active indefinitely
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Rides expire in 24 hours by default. Enable this to prevent automatic expiry.
                </p>
              </div>
              <input
                id="disableAutoExpiry"
                type="checkbox"
                checked={watch('disableAutoExpiry') || false}
                onChange={(e) => setValue('disableAutoExpiry', e.target.checked)}
                className="w-5 h-5 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex-shrink-0 pt-4 border-t">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || (watchedGender !== 'female' && !watchedAvatarUrl)}
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </Button>
            {watchedGender && watchedGender !== 'female' && !watchedAvatarUrl && (
              <p className="text-sm text-destructive text-center mt-2">Profile picture is required</p>
            )}
            {watchedGender === 'female' && !watchedAvatarUrl && (
              <p className="text-sm text-muted-foreground text-center mt-2">Profile picture is optional for female users</p>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;
