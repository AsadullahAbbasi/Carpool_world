'use client';

import { useState, useEffect } from 'react';
import { profileApi, storageApi } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { User, Phone, Upload } from 'lucide-react';
import { validatePhone, validateRequired } from '@/lib/validation';



interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdate?: () => void;
}

const ProfileDialog = ({ open, onOpenChange, onProfileUpdate }: ProfileDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    fullName: '',

    phone: '',
    avatarUrl: '',
    gender: '',
    nicNumber: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchProfile();
    }
  }, [open]);

  const fetchProfile = async () => {
    try {
      const { profile } = await profileApi.getProfile();
      if (profile) {
        setFormData({
          fullName: profile.fullName || '',

          phone: profile.phone || '',
          avatarUrl: profile.avatarUrl || '',
          gender: profile.gender || '',
          nicNumber: profile.nicNumber || '',
        });
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
      setFormData({ ...formData, avatarUrl: url });

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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    const fullNameCheck = validateRequired(formData.fullName, 'Full name');
    if (!fullNameCheck.valid) newErrors.fullName = fullNameCheck.error || '';



    const phoneCheck = validatePhone(formData.phone, true);
    if (!phoneCheck.valid) newErrors.phone = phoneCheck.error || '';

    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const previousErrors = { ...errors };
    setErrors({});

    // Close dialog immediately (optimistic)
    onOpenChange(false);

    try {
      await profileApi.updateProfile({
        fullName: formData.fullName,

        phone: formData.phone,
        avatarUrl: formData.avatarUrl,
        gender: formData.gender,
      });

      toast({
        title: 'Profile updated!',
        description: 'Your profile has been successfully updated.',
      });

      if (onProfileUpdate) {
        onProfileUpdate();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
      onOpenChange(true); // Reopen on error
      setErrors(previousErrors);
    } finally {
      setLoading(false);
    }
  };

  // Handle phone input - only allow numbers, +, spaces, dashes, and parentheses
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers, +, spaces, dashes, and parentheses
    const phoneRegex = /^[\d\+\s\-\(\)]*$/;
    if (phoneRegex.test(value) || value === '') {
      setFormData({ ...formData, phone: value });
      if (errors.phone) setErrors({ ...errors, phone: '' });
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your profile information</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto flex-1 pr-2 -mr-2">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={formData.avatarUrl} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {formData.fullName.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <Label htmlFor="avatar" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-md transition-colors">
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Change Avatar'}
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

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="fullName"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="pl-10"
                required
              />
            </div>
          </div>



          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="03001234567"
                value={formData.phone}
                onChange={handlePhoneChange}
                onKeyDown={(e) => {
                  // Prevent non-numeric characters except +, -, space, (, )
                  if (!/[0-9\+\-\(\)\s]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                maxLength={15}
                className={`pl-10 ${errors.phone ? 'border-destructive' : ''}`}
                required
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <select
              id="gender"
              value={formData.gender}
              onChange={(e) => {
                setFormData({ ...formData, gender: e.target.value });
                if (errors.gender) setErrors({ ...errors, gender: '' });
              }}
              className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${errors.gender ? 'border-destructive' : ''}`}
              required
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {errors.gender && (
              <p className="text-sm text-destructive">{errors.gender}</p>
            )}
          </div>

          {formData.nicNumber && (
            <div className="space-y-2">
              <Label htmlFor="nicNumber">NIC Number</Label>
              <Input
                id="nicNumber"
                value={formData.nicNumber}
                disabled
                className="bg-muted cursor-not-allowed"
                readOnly
              />
              <p className="text-xs text-muted-foreground">
                NIC number is verified and cannot be edited
              </p>
            </div>
          )}

          <div className="flex-shrink-0 pt-4 border-t">
            <Button type="submit" className="w-full" disabled={loading || !formData.avatarUrl}>
              {loading ? 'Updating...' : 'Update Profile'}
            </Button>
            {!formData.avatarUrl && (
              <p className="text-sm text-destructive text-center mt-2">Profile picture is required</p>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileDialog;
