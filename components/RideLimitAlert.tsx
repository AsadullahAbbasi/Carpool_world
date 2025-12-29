'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { X } from 'lucide-react';

interface RideLimitAlertProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: 'active' | 'expired';
    onNavigateToMyRides: () => void;
    onProceed?: () => void;
}

export default function RideLimitAlert({
    open,
    onOpenChange,
    type,
    onNavigateToMyRides,
    onProceed,
}: RideLimitAlertProps) {
    if (type === 'active') {
        return (
            <AlertDialog open={open} onOpenChange={onOpenChange}>
                <AlertDialogContent>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </button>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Active Ride Already Exists</AlertDialogTitle>
                        <AlertDialogDescription>
                            You already have an active ride posted. To maintain quality and prevent spam, you can only have one active ride at a time.
                            <br /><br />
                            You can edit your existing ride or delete it before creating a new one.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onNavigateToMyRides}>
                            Go to My Rides
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <button
                    onClick={() => onOpenChange(false)}
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>
                <AlertDialogHeader>
                    <AlertDialogTitle>One Ride Limit</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                        <p>
                            You can only have <strong>one ride at a time</strong>. You currently have an expired ride in your account.
                        </p>
                        <p>
                            <strong>✅ Recommended:</strong> Go to My Rides tab to edit, reactivate, or delete your existing ride before creating a new one.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onNavigateToMyRides}>
                        Go to My Rides
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
