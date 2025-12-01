'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowPrompt(false);
        }
    };

    if (!showPrompt) return null;

    return (
        <div className={`fixed bottom-20 left-4 right-4 z-50 md:hidden transition-all duration-300 ${showPrompt ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'}`}>
            <div className="bg-background border border-border rounded-lg shadow-lg p-4 flex items-center justify-between gap-4">
                <div className="flex-1">
                    <h3 className="font-semibold text-sm">Install App</h3>
                    <p className="text-xs text-muted-foreground">Add to home screen for better experience</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setShowPrompt(false)} className="h-8 w-8 p-0">
                        <X className="w-4 h-4" />
                    </Button>
                    <Button size="sm" onClick={handleInstall} className="gap-2">
                        <Download className="w-4 h-4" />
                        Install
                    </Button>
                </div>
            </div>
        </div>
    );
}
