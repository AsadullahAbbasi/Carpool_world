'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { profileApi, storageApi, authApi } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { User, Phone, AtSign, Upload } from 'lucide-react';
import { validatePhone } from '@/lib/validation';
import { normalizePhoneNumber } from '@/lib/zod-schemas';
import NicVerification from './NicVerification';

const ProfileCompletion = () => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formData, setFormData] = useState({
    fullName: '',

    phone: '',
    avatarUrl: '',
    gender: '',
  });
  const [phoneError, setPhoneError] = useState('');
  const [showNicVerification, setShowNicVerification] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const fetchProfile = async () => {
    try {
      setInitialLoading(true);
      const data: any = await authApi.getCurrentUser();
      if (!data || !data.user) {
        // Only redirect on client side
        if (typeof window !== 'undefined') {
          router.push('/auth');
        }
        return;
      }

      const { profile }: any = await profileApi.getProfile();

      if (profile) {
        setFormData({
          fullName: profile.fullName || '',

          phone: profile.phone || '',
          avatarUrl: profile.avatarUrl || '',
          gender: profile.gender || '',
        });

        // If profile is already complete, redirect to dashboard (client-side only)
        if (
          profile.fullName &&

          profile.phone &&
          profile.avatarUrl &&
          profile.gender
        ) {
          if (typeof window !== 'undefined') {
            router.push('/dashboard');
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      // Only redirect on client side
      if (typeof window !== 'undefined') {
        router.push('/auth');
      }
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchProfile();
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted || initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { url } = await storageApi.uploadAvatar(file);
      setFormData({ ...formData, avatarUrl: url });

      toast({
        title: '✅ Avatar Uploaded',
        description: 'Your profile picture has been uploaded successfully!',
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

  const handlePhoneChange = (value: string) => {
    setFormData({ ...formData, phone: value });
    const validation = validatePhone(value, true);
    if (!validation.valid) {
      setPhoneError(validation.error || '');
    } else {
      setPhoneError('');
      // Auto-normalize phone number
      if (validation.normalized) {
        setFormData({ ...formData, phone: validation.normalized });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate phone number
      const phoneValidation = validatePhone(formData.phone, true);
      if (!phoneValidation.valid) {
        setPhoneError(phoneValidation.error || '');
        throw new Error(phoneValidation.error || 'Invalid phone number');
      }

      if (!formData.fullName || !formData.phone || !formData.avatarUrl || !formData.gender) {
        throw new Error('Please fill in all required fields including profile picture');
      }

      // Normalize phone number before saving
      const normalizedPhone = phoneValidation.normalized || normalizePhoneNumber(formData.phone);

      await profileApi.updateProfile({
        fullName: formData.fullName,

        phone: normalizedPhone,
        avatarUrl: formData.avatarUrl,
        gender: formData.gender,
      });

      toast({
        title: '🎉 Profile Complete!',
        description: 'Your profile has been set up successfully!',
      });

      router.push('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-12">
      <Card className="w-full max-w-2xl animate-fade-in">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Complete Your Profile</CardTitle>
          <CardDescription>Please provide the following information to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={formData.avatarUrl} />
                <AvatarFallback>
                  <User className="w-12 h-12" />
                </AvatarFallback>
              </Avatar>
              <div>
                <input
                  type="file"
                  id="avatar"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
                <Label htmlFor="avatar">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => document.getElementById('avatar')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Photo'}
                  </Button>
                </Label>
              </div>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
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



            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number (Pakistan) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder="03001234567 or 923001234567"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              {phoneError && (
                <p className="text-sm text-destructive">{phoneError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter Pakistani mobile number (e.g., 03001234567 or 923001234567)
              </p>
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label htmlFor="gender">
                Gender <span className="text-destructive">*</span>
              </Label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !formData.avatarUrl || !!phoneError}>
              {loading ? 'Saving...' : 'Complete Profile'}
            </Button>
            {!formData.avatarUrl && (
              <p className="text-sm text-destructive text-center">Profile picture is required</p>
            )}
          </form>

          {/* Optional NIC Verification */}
          <div className="mt-8 pt-8 border-t border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">NIC Verification (Optional)</h3>
                <p className="text-sm text-muted-foreground">
                  Verify your NIC to build trust. You can do this later.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNicVerification(!showNicVerification)}
              >
                {showNicVerification ? 'Hide' : 'Verify NIC'}
              </Button>
            </div>
            {showNicVerification && (
              <div className="mt-4 animate-fade-in">
                <NicVerification />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileCompletion;
