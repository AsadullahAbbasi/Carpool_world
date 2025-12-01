'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api-client';
import { LogIn, UserPlus } from 'lucide-react';

interface AuthGateProps {
  children: React.ReactNode;
  action?: string; // Description of the action that requires auth
  onAuthenticated?: () => void;
}

/**
 * Authentication Gate Component
 * Shows a modal when user tries to perform an action that requires authentication
 */
const AuthGate = ({ children, action = 'perform this action', onAuthenticated }: AuthGateProps) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data: any = await authApi.getCurrentUser();
        if (data && data.user) {
          setIsAuthenticated(true);
          if (onAuthenticated) {
            onAuthenticated();
          }
        } else {
          setIsAuthenticated(false);
          setShowModal(true);
        }
      } catch (error) {
        setIsAuthenticated(false);
        setShowModal(true);
      }
    };

    checkAuth();
  }, [onAuthenticated]);

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return null;
  }

  // If authenticated, render children
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // If not authenticated, show modal
  return (
    <>
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle>Sign In Required</DialogTitle>
            <DialogDescription>
              You need to sign in to {action}. Create an account or sign in to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={() => {
                router.push('/auth');
                setShowModal(false);
              }}
              className="w-full"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                router.push('/auth');
                setShowModal(false);
              }}
              className="w-full"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Sign Up
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Render children but they won't be functional until authenticated */}
      {children}
    </>
  );
};

export default AuthGate;

