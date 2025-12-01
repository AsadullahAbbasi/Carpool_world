'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api-client';
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/email-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Car, Users } from 'lucide-react';
import { validateEmail } from '@/lib/validation';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Check URL for password recovery token
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    
    if (type === 'reset-password' && token) {
      setIsPasswordRecovery(true);
      setIsLogin(false);
      setIsForgotPassword(false);
    }
  }, [searchParams]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
            console.error('Failed to send password reset email:', emailError);
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
          router.push('/dashboard');
        } catch (loginError: any) {
          // Check if it's an email verification error
          if (loginError.message?.includes('Email not verified') || loginError.message?.includes('email')) {
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
          console.error('Failed to send verification email:', emailError);
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/10 p-4">
      <Card className="w-full max-w-md shadow-medium">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mb-2">
            <Car className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">RideShare</CardTitle>
          <CardDescription className="flex items-center justify-center gap-2">
            <Users className="w-4 h-4" />
            Connect. Share. Travel Together.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {isPasswordRecovery ? (
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
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
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                )}
              </>
            )}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
              disabled={loading}
            >
              {loading ? 'Loading...' : isPasswordRecovery ? 'Update Password' : isForgotPassword ? 'Send Reset Link' : isLogin ? 'Log In' : 'Sign Up'}
            </Button>
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
