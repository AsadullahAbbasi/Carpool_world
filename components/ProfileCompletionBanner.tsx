'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, AlertCircle, ShieldAlert } from 'lucide-react';
import { authApi } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import NicVerification from './NicVerification';

/**
 * Profile Completion Banner
 * Shows a banner at the top of the dashboard if profile is incomplete or NIC is not verified
 */
const ProfileCompletionBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const [isNicVerified, setIsNicVerified] = useState(true);
  const [isNicPending, setIsNicPending] = useState(false);
  const [showNicDialog, setShowNicDialog] = useState(false);
  const [bannerType, setBannerType] = useState<'profile' | 'nic' | 'nic-pending'>('profile');
  const router = useRouter();

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const data: any = await authApi.getCurrentUser();
        if (data && data.profile) {
          const profile = data.profile;
          const complete = !!(
            profile.fullName &&
            profile.phone &&
            profile.avatarUrl &&
            profile.gender
          );
          const nicVerified = profile.nicVerified || false;
          const nicPending = !nicVerified && (profile.nicFrontImageUrl || profile.nicBackImageUrl);

          setIsProfileComplete(complete);
          setIsNicVerified(nicVerified);
          setIsNicPending(nicPending);

          // Show banner based on profile and NIC status
          if (!complete) {
            setBannerType('profile');
            setShowBanner(true);
          } else if (nicVerified) {
            // NIC is verified - hide banner
            setShowBanner(false);
          } else if (nicPending) {
            // NIC submitted but pending approval
            setBannerType('nic-pending');
            setShowBanner(true);
          } else {
            // NIC not submitted
            setBannerType('nic');
            setShowBanner(true);
          }
        }
      } catch (error) {
        // Silently fail - don't show banner if we can't check
        setIsProfileComplete(true);
        setIsNicVerified(true);
        setIsNicPending(false);
        setShowBanner(false);
      }
    };

    checkProfile();

    // Re-check periodically to update banner status
    const interval = setInterval(checkProfile, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleNicVerificationComplete = async () => {
    setShowNicDialog(false);
    // Re-check profile status
    try {
      const data: any = await authApi.getCurrentUser();
      if (data && data.profile) {
        const nicVerified = data.profile.nicVerified || false;
        const nicPending = !nicVerified && (data.profile.nicFrontImageUrl || data.profile.nicBackImageUrl);
        setIsNicVerified(nicVerified);
        setIsNicPending(nicPending);

        if (nicVerified) {
          setShowBanner(false);
        } else if (nicPending) {
          setBannerType('nic-pending');
          setShowBanner(true);
        }
      }
    } catch (error) {
      // If check fails, reload page
      window.location.reload();
    }
  };

  if (!showBanner) {
    return null;
  }

  if (bannerType === 'profile' && !isProfileComplete) {
    return (
      <Alert className="mb-6 border-border bg-muted/50 animate-slide-up">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Complete Your Profile</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>Complete your profile to post rides and access all features.</span>
          <div className="flex items-center gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/profile-completion')}
            >
              Complete Profile
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowBanner(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // NIC Pending Approval Banner
  if (bannerType === 'nic-pending' && isNicPending && !isNicVerified && isProfileComplete) {
    return (
      <Alert className="mb-6 border-blue-500/50 bg-blue-500/10 animate-slide-up shadow-lg">
        <ShieldAlert className="h-5 w-5 text-blue-600 dark:text-blue-500" />
        <AlertTitle className="text-blue-900 dark:text-blue-100 text-lg font-bold">
          ⏳ NIC Verification Pending
        </AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
          <div className="flex-1">
            <p className="text-blue-800 dark:text-blue-200 font-medium">
              Your NIC verification is under review. We'll notify you once it's approved.
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
              This usually takes 24-48 hours.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-900 dark:text-blue-100 hover:bg-blue-500/20 flex-shrink-0"
            onClick={() => setShowBanner(false)}
            title="Dismiss (will show again on refresh)"
          >
            <X className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // NIC Not Submitted Banner
  if (bannerType === 'nic' && !isNicVerified && !isNicPending && isProfileComplete) {
    return (
      <>
        <Alert className="mb-6 border-yellow-500/50 bg-yellow-500/10 animate-slide-up shadow-lg">
          <ShieldAlert className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
          <AlertTitle className="text-yellow-900 dark:text-yellow-100 text-lg font-bold">
            ⚠️ NIC Not Verified
          </AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
            <div className="flex-1">
              <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                Your NIC is not verified. Verify your NIC to:
              </p>
              <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 list-disc list-inside space-y-1">
                <li>Build trust with other users</li>
                <li>Remove "NIC Not Verified" badge from your rides</li>
                <li>Access all platform features</li>
              </ul>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowNicDialog(true)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white border-0 shadow-md"
              >
                Verify NIC Now
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-500/20"
                onClick={() => setShowBanner(false)}
                title="Dismiss (will show again on refresh)"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        <Dialog open={showNicDialog} onOpenChange={setShowNicDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>NIC Verification</DialogTitle>
              <DialogDescription>
                Upload clear photos of your NIC front and back for verification. This helps build trust in the community.
              </DialogDescription>
            </DialogHeader>
            <NicVerification onVerificationComplete={handleNicVerificationComplete} />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return null;
};

export default ProfileCompletionBanner;

