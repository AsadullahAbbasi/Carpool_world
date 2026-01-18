'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { authApi } from '@/lib/api-client';
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/email-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { validateEmail, validatePassword } from '@/lib/validation';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    // Check URL for password recovery token
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    const mode = searchParams.get('mode');

    if (type === 'reset-password' && token) {
      setIsPasswordRecovery(true);
      setIsLogin(false);
      setIsForgotPassword(false);
    } else if (mode === 'signup') {
      // If mode=signup in URL, show signup form
      setIsLogin(false);
      setIsForgotPassword(false);
      setIsPasswordRecovery(false);
    }
  }, [searchParams]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isRedirecting) return;

    // Validate email if provided
    if (email) {
      const emailCheck = validateEmail(email);
      if (!emailCheck.valid) {
        setErrors({ email: emailCheck.error || '' });
        toast({
          title: 'Validation Error',
          description: emailCheck.error,
          variant: 'destructive',
        });
        return;
      }
    }

    // Validate password for signup
    if (!isLogin && !isForgotPassword && !isPasswordRecovery) {
      const passwordCheck = validatePassword(password, email, fullName);
      if (!passwordCheck.valid) {
        toast({
          title: 'Weak Password',
          description: passwordCheck.error,
          variant: 'destructive',
        });
        return;
      }
    }

    setErrors({});
    setLoading(true);

    try {
      if (isPasswordRecovery) {
        const token = searchParams.get('token');
        if (!token) throw new Error('Reset token is required');

        await authApi.resetPassword(token, password);

        toast({
          title: 'Password updated!',
          description: 'Your password has been successfully changed.',
        });
        setIsPasswordRecovery(false);
        setIsLogin(true);
        setPassword('');
        router.push('/auth');
      } else if (isForgotPassword) {
        const response = await authApi.forgotPassword(email) as { message: string; resetToken?: string };

        // Send email client-side if token is returned
        if (response.resetToken) {
          try {
            await sendPasswordResetEmail(email, response.resetToken);
          } catch (emailError: any) {

            const errorMessage = emailError?.message || 'Unknown error';

            // Check if it's a configuration error
            if (errorMessage.includes('EmailJS configuration is missing') || errorMessage.includes('Missing variables')) {
              toast({
                title: 'Email Configuration Missing',
                description: 'EmailJS is not configured. Please set up your .env.local file with EmailJS credentials. Check ENV_EXAMPLE.txt for reference.',
                variant: 'destructive',
              });
            } else {
              toast({
                title: 'Error',
                description: `Account found but failed to send email: ${errorMessage}. Please try again.`,
                variant: 'destructive',
              });
            }
            return;
          }
        }

        toast({
          title: 'Password reset email sent!',
          description: 'Check your email (including spam folder) for the password reset link. The link expires in 1 hour.',
        });
        setIsForgotPassword(false);
        setEmail('');
      } else if (isLogin) {
        try {
          await authApi.login(email, password);
          toast({
            title: 'Welcome back!',
            description: 'You have successfully logged in.',
          });
          setIsRedirecting(true);
          router.replace('/dashboard');
        } catch (loginError: any) {
          // Check if it's an email verification error
          if (loginError.message?.includes('Email not verified') || loginError.message?.includes('email')) {
            setShowResendVerification(true);
            toast({
              title: 'Email not verified',
              description: 'Please verify your email address before logging in. Check your inbox for the verification link.',
              variant: 'destructive',
            });
          } else {
            throw loginError; // Re-throw to be caught by outer catch
          }
        }
      } else {
        const response = await authApi.signup(email, password, fullName) as {
          token: string;
          verificationToken: string;
          user: any;
        };

        // Send verification email client-side
        try {
          await sendVerificationEmail(email, response.verificationToken);
        } catch (emailError: any) {

          const errorMessage = emailError?.message || 'Unknown error';

          // Check if it's a configuration error
          if (errorMessage.includes('EmailJS configuration is missing') || errorMessage.includes('Missing variables')) {
            toast({
              title: 'Email Configuration Missing',
              description: 'EmailJS is not configured. Please set up your .env.local file with EmailJS credentials. Check ENV_EXAMPLE.txt for reference.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Account created but email failed',
              description: `Your account was created but we couldn't send the verification email: ${errorMessage}. Please contact support.`,
              variant: 'destructive',
            });
          }
          return;
        }

        toast({
          title: 'Account created!',
          description: 'Please check your email (including spam folder) to verify your account. The verification link expires in 24 hours.',
        });

        // Clear form
        setEmail('');
        setPassword('');
        setFullName('');
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Please enter your email and password to resend the verification link.',
        variant: 'destructive',
      });
      return;
    }

    setResending(true);
    try {
      const response = await authApi.resendVerification(email, password);

      // Send the email using the new token
      await sendVerificationEmail(email, response.token);

      toast({
        title: 'Verification email sent!',
        description: 'Please check your inbox (and spam folder) for the new verification link.',
      });
      setCooldown(120); // Start 120s (2m) cooldown
    } catch (error: any) {
      toast({
        title: 'Failed to resend',
        description: error.message || 'Failed to resend verification email. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/10 p-4">
        <div className="w-full max-w-md text-center space-y-3">
          <div className="h-10 w-10 rounded-full border-2 border-muted-foreground/40 border-t-foreground mx-auto animate-spin" />
          <p className="text-sm text-muted-foreground">Redirecting to dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-medium">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 relative flex items-center justify-center mb-2">
            {/* Light mode */}
            <Image
              src="/RideShare_Logo.png"
              alt="RideShare Logo"
              width={64}
              height={64}
              className="w-full h-full object-contain dark:hidden"
              priority
            />
            {/* Dark mode */}
            <Image
              src="/nightLogo.png"
              alt="RideShare Logo"
              width={64}
              height={64}
              className="w-full h-full object-contain hidden dark:block"
              priority
            />
          </div>
          <CardTitle className="text-3xl font-bold">RideShare</CardTitle>
          <CardDescription className="flex items-center justify-center gap-2">
            Connect. Share. Travel Together.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {isPasswordRecovery ? (
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {!isLogin && !isForgotPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required={!isLogin && !isForgotPassword}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: '' });
                    }}
                    required
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                {!isForgotPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
              disabled={loading || isRedirecting}
            >
              {loading ? 'Loading...' : isPasswordRecovery ? 'Update Password' : isForgotPassword ? 'Send Reset Link' : isLogin ? 'Log In' : 'Sign Up'}
            </Button>
            {showResendVerification && (
              <Button
                type="button"
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary/5"
                onClick={handleResendVerification}
                disabled={resending || cooldown > 0}
              >
                {resending ? 'Sending...' : cooldown > 0 ? (
                  `Resend in ${Math.floor(cooldown / 60)}:${(cooldown % 60).toString().padStart(2, '0')}`
                ) : 'Resend Verification Email'}
              </Button>
            )}
            {showResendVerification && (
              <div className="text-[11px] text-muted-foreground text-center mt-2 px-2 bg-muted/30 py-2 rounded border border-dashed">
                <p className="font-semibold mb-1">Didn't receive the email?</p>
                <ul className="text-left list-disc list-inside space-y-0.5">
                  <li>Check your <strong>Spam or Junk</strong> folder.</li>
                  <li>Wait 2-3 minutes for the delivery.</li>
                  <li>Ensure the email above is correct.</li>
                </ul>
              </div>
            )}
          </form>
          <div className="mt-4 text-center text-sm space-y-2">
            {!isPasswordRecovery && (
              <>
                {isLogin && !isForgotPassword && (
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-primary hover:underline block w-full"
                  >
                    Forgot password?
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setIsForgotPassword(false);
                  }}
                  className="text-primary hover:underline block w-full"
                >
                  {isForgotPassword ? 'Back to login' : isLogin ? 'Need an account? Sign up' : 'Already have an account? Log in'}
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
