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
                <AlertDialogHeader>
                    <AlertDialogTitle>One Ride Limit</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                        <p>
                            You can only have <strong>one ride at a time</strong>. You currently have an expired ride in your account.
                        </p>
                        <p>
                            <strong>✅ Recommended:</strong> Edit or reactivate your existing ride to update the details (location, time, etc.).
                        </p>
                        <p className="text-muted-foreground text-sm">
                            <strong>Alternative:</strong> Create a new ride (your expired ride will be replaced).
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onProceed}>Create New Ride</AlertDialogCancel>
                    <AlertDialogAction onClick={onNavigateToMyRides}>
                        Edit/Reactivate Ride
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
