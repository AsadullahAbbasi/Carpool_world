'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api-client';
import { sendVerificationEmail } from '@/lib/email-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Mail } from 'lucide-react';

import { Suspense } from 'react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'checking'>('checking');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sendingEmail, setSendingEmail] = useState(false);
  const { toast } = useToast();

  // Check if user is already logged in and verify email
  useEffect(() => {
    const checkAuthAndVerify = async () => {
      try {
        const data: any = await authApi.getCurrentUser();
        if (data && data.user) {
          // User is already logged in, redirect to dashboard
          router.push('/dashboard');
          return;
        }
      } catch (error) {
        // User is not logged in, continue with verification
      }
      
      // Check for verification token in URL
      const token = searchParams.get('token');
      if (!token) {
        setStatus('error');
        return;
      }

      // Start verification
      setStatus('loading');
      
      try {
        const response: any = await authApi.verifyEmail(token);
        setStatus('success');

        // The API now auto-logs in the user and sets the cookie
        toast({
          title: 'Email verified!',
          description: 'Your email has been successfully verified. Redirecting to dashboard...',
        });

        setTimeout(() => {
          router.push('/dashboard'); // Redirect to dashboard (auto-logged in)
        }, 2000);
      } catch (error: any) {
        setStatus('error');
        toast({
          title: 'Verification failed',
          description: error.message || 'Invalid or expired verification token',
          variant: 'destructive',
        });
      }
    };

    checkAuthAndVerify();
  }, [searchParams, router, toast]);

  // Timer countdown for resend cooldown
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
      setResendCooldown(90); // 1.5 minutes = 90 seconds
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {(status === 'loading' || status === 'checking') && (
            <>
              <CardTitle className="text-2xl">Verifying Email...</CardTitle>
              <CardDescription>Please wait while we verify your email address</CardDescription>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Email Verified!</CardTitle>
              <CardDescription>Your email has been successfully verified. Logging you in...</CardDescription>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <CardTitle className="text-2xl">Verification Failed</CardTitle>
              <CardDescription>The verification link is invalid or has expired</CardDescription>
            </>
          )}
        </CardHeader>
        {status === 'error' && (
          <CardContent className="text-center space-y-4">
            <div className="flex flex-col gap-3">
              <Button 
                onClick={handleResendEmail}
                disabled={resendCooldown > 0 || sendingEmail}
                className="w-full"
                variant="default"
              >
                <Mail className="w-4 h-4 mr-2" />
                {sendingEmail 
                  ? 'Sending...' 
                  : resendCooldown > 0 
                    ? `Resend in ${Math.floor(resendCooldown / 60)}:${String(resendCooldown % 60).padStart(2, '0')}` 
                    : 'Resend Verification Email'}
              </Button>
              <Button 
                onClick={() => router.push('/auth')}
                variant="outline"
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
