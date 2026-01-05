'use client';

import { useState, useEffect } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShieldAlert } from 'lucide-react';

export default function SafetyNoticeModal() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        // Check if the user has already acknowledged the notice
        const hasAcknowledged = localStorage.getItem('safety_notice_acknowledged');
        if (!hasAcknowledged) {
            setOpen(true);
        }
    }, []);

    const handleAcknowledge = () => {
        localStorage.setItem('safety_notice_acknowledged', 'true');
        setOpen(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogContent className="max-w-[400px] rounded-2xl border-primary/20 shadow-2xl">
                <AlertDialogHeader className="items-center text-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <ShieldAlert className="h-6 w-6 text-primary" />
                    </div>
                    <AlertDialogTitle className="text-2xl font-bold tracking-tight">
                        Safety Notice
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-base text-muted-foreground leading-relaxed ">
                        "Please make sure to verify the people you&apos;re traveling with. We&apos;ve just started out and won&apos;t be responsible for any issues. Stay safe ❤️"
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="sm:justify-center mt-6">
                    <AlertDialogAction
                        onClick={handleAcknowledge}
                        className="w-full sm:w-[200px] h-11 text-base font-semibold transition-all duration-200 hover:scale-[1.02]"
                    >
                        I Understand
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
