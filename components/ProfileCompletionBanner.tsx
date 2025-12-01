'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, AlertCircle, ShieldAlert, Mail } from 'lucide-react';
import { authApi } from '@/lib/api-client';
import { sendVerificationEmail } from '@/lib/email-client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import NicVerification from './NicVerification';
import ProfileDialog from './ProfileDialog';

/**
 * Profile Completion Banner
 * Shows a banner at the top of the dashboard if profile is incomplete or NIC is not verified
 */
const ProfileCompletionBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const [isNicVerified, setIsNicVerified] = useState(true);
  const [isNicPending, setIsNicPending] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(true);
  const [email, setEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showNicDialog, setShowNicDialog] = useState(false);
  const [bannerType, setBannerType] = useState<'profile' | 'nic' | 'nic-pending' | 'email-unverified'>('profile');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Check if banner was dismissed
  const isBannerDismissed = (type: string) => {
    if (typeof window === 'undefined') return false;
    const dismissed = localStorage.getItem(`banner-dismissed-${type}`);
    return dismissed === 'true';
  };

  // Mark banner as dismissed
  const dismissBanner = (type: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`banner-dismissed-${type}`, 'true');
    }
    setShowBanner(false);
  };

  const checkProfile = async () => {
    try {
      const data: any = await authApi.getCurrentUser();
      if (data && data.profile) {
        const profile = data.profile;
        // Avatar is required for male/other, optional for female
        const hasRequiredFields = !!(
          profile.fullName &&
          profile.phone &&
          profile.gender
        );
        const hasAvatar = !!profile.avatarUrl;
        const avatarRequired = profile.gender !== 'female';
        const complete = hasRequiredFields && (avatarRequired ? hasAvatar : true);
        
        const nicVerified = profile.nicVerified || false;
        const nicPending = !nicVerified && (profile.nicFrontImageUrl || profile.nicBackImageUrl);
        const emailVerified = data.user.emailVerified;

        setIsProfileComplete(complete);
        setIsNicVerified(nicVerified);
        setIsNicPending(nicPending);
        setIsEmailVerified(emailVerified);
        setEmail(data.user.email);

        // Show banner based on profile and NIC status
        // Only show if not dismissed
        if (!emailVerified && !isBannerDismissed('email-unverified')) {
          setBannerType('email-unverified');
          setShowBanner(true);
        } else if (!complete && !isBannerDismissed('profile')) {
          setBannerType('profile');
          setShowBanner(true);
        } else if (nicVerified) {
          // NIC is verified - hide banner and clear dismissed state
          if (typeof window !== 'undefined') {
            localStorage.removeItem('banner-dismissed-nic');
            localStorage.removeItem('banner-dismissed-nic-pending');
          }
          setShowBanner(false);
        } else if (nicPending && !isBannerDismissed('nic-pending')) {
          // NIC submitted but pending approval
          setBannerType('nic-pending');
          setShowBanner(true);
        } else if (!nicPending && !nicVerified && !isBannerDismissed('nic')) {
          // NIC not submitted
          setBannerType('nic');
          setShowBanner(true);
        } else {
          setShowBanner(false);
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

  useEffect(() => {
    checkProfile();

    // Re-check periodically to update banner status
    const interval = setInterval(checkProfile, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    try {
      setSendingEmail(true);
      const { token, email } = await authApi.resendVerification();
      await sendVerificationEmail(email, token);
      toast({
        title: 'Email sent',
        description: 'Check your inbox for the verification link.',
      });
      setResendCooldown(60);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send email',
        variant: 'destructive',
      });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleNicVerificationComplete = async () => {
    setShowNicDialog(false);
    // Clear dismissed state when verification status changes
    if (typeof window !== 'undefined') {
      localStorage.removeItem('banner-dismissed-nic');
      localStorage.removeItem('banner-dismissed-nic-pending');
    }
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

  // Email Verification Banner
  if (bannerType === 'email-unverified' && !isEmailVerified) {
    return (
      <Alert className="mb-4 sm:mb-6 border-orange-500/50 bg-orange-500/10 animate-slide-up shadow-lg relative pr-8 sm:pr-10 p-[1rem] sm:p-[1.25rem]">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 sm:h-6 sm:w-6 absolute top-2 right-2 sm:top-3 sm:right-3 text-orange-900 dark:text-orange-100 hover:bg-orange-500/20"
          onClick={() => dismissBanner('email-unverified')}
        >
          <X className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-500 mb-[0.5rem]" />
        <AlertTitle className="text-orange-900 dark:text-orange-100 text-base sm:text-lg font-bold mb-[0.5rem]">
          Verify Your Email
        </AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-[0.75rem] sm:gap-[1rem]">
          <div className="flex-1 text-center sm:text-left w-full sm:w-auto">
            <p className="text-orange-800 dark:text-orange-200 font-medium text-sm sm:text-base">
              Please verify your email address ({email}) to access all features.
            </p>
          </div>
          <div className="w-full sm:w-auto mt-[0.5rem] sm:mt-0 flex justify-center sm:justify-end">
            <Button
              variant="default"
              size="sm"
              onClick={handleResendEmail}
              disabled={resendCooldown > 0 || sendingEmail}
              className="bg-orange-600 hover:bg-orange-700 text-white border-0 shadow-md w-full sm:w-auto text-sm h-[2.75rem] sm:h-[2.5rem]"
            >
              {sendingEmail ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (bannerType === 'profile' && !isProfileComplete) {
    return (
      <>
        <Alert className="mb-4 sm:mb-6 border-border bg-muted/50 animate-slide-up relative pr-8 sm:pr-10 p-[1rem] sm:p-[1.25rem]">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 sm:h-6 sm:w-6 absolute top-2 right-2 sm:top-3 sm:right-3 text-muted-foreground hover:bg-transparent"
            onClick={() => dismissBanner('profile')}
          >
            <X className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <AlertCircle className="h-4 w-4 mb-[0.5rem]" />
          <AlertTitle className="text-base sm:text-lg font-semibold mb-[0.5rem]">Complete Your Profile</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-[0.75rem] sm:gap-[1rem]">
            <span className="text-xs sm:text-sm text-center sm:text-left w-full sm:w-auto">
              Complete your profile to post rides and access all features.
            </span>
            <div className="w-full sm:w-auto mt-1 sm:mt-0 flex justify-center sm:justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProfileDialog(true)}
                className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9"
              >
                Complete Profile
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        <ProfileDialog
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          completionMessage="Please complete your profile to access all features."
          onProfileUpdate={() => {
            setShowProfileDialog(false);
            // Re-check profile status
            checkProfile();
          }}
        />
      </>
    );
  }

  // NIC Pending Approval Banner
  if (bannerType === 'nic-pending' && isNicPending && !isNicVerified && isProfileComplete) {
    return (
      <Alert className="mb-4 sm:mb-6 border-blue-500/50 bg-blue-500/10 animate-slide-up shadow-lg relative pr-8 sm:pr-10 p-[1rem] sm:p-[1.25rem]">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 sm:h-6 sm:w-6 absolute top-2 right-2 sm:top-3 sm:right-3 text-blue-900 dark:text-blue-100 hover:bg-blue-500/20"
          onClick={() => dismissBanner('nic-pending')}
        >
          <X className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        <ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-500 mb-[0.5rem]" />
        <AlertTitle className="text-blue-900 dark:text-blue-100 text-base sm:text-lg font-bold mb-[0.5rem]">
          ⏳ NIC Verification Pending
        </AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-[0.5rem] sm:gap-[1rem]">
          <div className="flex-1 text-center sm:text-left w-full sm:w-auto">
            <p className="text-blue-800 dark:text-blue-200 font-medium text-sm sm:text-base">
              Your NIC verification is under review.
            </p>
            <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 mt-[0.5rem]">
              This usually takes 24-48 hours.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // NIC Not Submitted Banner
  if (bannerType === 'nic' && !isNicVerified && !isNicPending && isProfileComplete) {
    return (
      <>
      <Alert className="mb-4 sm:mb-6 border-yellow-500/50 bg-yellow-500/10 animate-slide-up shadow-lg relative pr-8 sm:pr-10 p-[1rem] sm:p-[1.25rem]">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 sm:h-6 sm:w-6 absolute top-2 right-2 sm:top-3 sm:right-3 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-500/20"
          onClick={() => dismissBanner('nic')}
        >
          <X className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        <ShieldAlert className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 dark:text-yellow-500 mb-[0.5rem]" />
        <AlertTitle className="text-yellow-900 dark:text-yellow-100 text-base sm:text-lg font-bold mb-[0.5rem]">
          ⚠️ NIC Not Verified
        </AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-[0.75rem] sm:gap-[1rem]">
          <div className="flex-1 text-center sm:text-left w-full sm:w-auto">
            <p className="text-yellow-800 dark:text-yellow-200 font-medium text-sm sm:text-base mb-[0.5rem]">
              Your NIC is not verified. Verify your NIC to:
            </p>
            <ul className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-[0.25rem]">
              <li>Build trust with other users</li>
              <li>Remove "NIC Not Verified" badge from your rides</li>
              <li>Access all platform features</li>
            </ul>
          </div>
          <div className="w-full sm:w-auto mt-[0.5rem] sm:mt-0 flex justify-center sm:justify-end">
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowNicDialog(true)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white border-0 shadow-md w-full sm:w-auto text-sm h-[2.75rem] sm:h-[2.5rem]"
            >
              Verify NIC Now
            </Button>
          </div>
        </AlertDescription>
      </Alert>

        <Dialog open={showNicDialog} onOpenChange={setShowNicDialog}>
          <DialogContent className="w-[calc(100%-1rem)] max-w-3xl max-h-[90vh] overflow-y-auto sm:w-full">
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

