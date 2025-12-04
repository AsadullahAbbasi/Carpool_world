'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Users, PlusCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import ProfileDialog from './ProfileDialog';
import { CreateRideDialog } from './CreateRideDialog';

export default function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const [profileDialogOpen, setProfileDialogOpen] = useState(false);
    const [createRideDialogOpen, setCreateRideDialogOpen] = useState(false);
    const [currentTab, setCurrentTab] = useState<string | null>(null);

    // Update tab state when URL changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            setCurrentTab(urlParams.get('tab'));
        }
    }, [pathname]);

    // Hide on desktop and public pages (landing, auth)
    const publicPages = ['/', '/auth', '/auth/verify-email', '/auth/reset-password'];
    const isPublicPage = publicPages.includes(pathname);

    // Don't render on public pages
    if (isPublicPage) {
        return null;
    }

    // Check if we're on dashboard and determine active tab from URL
    const isDashboard = pathname === '/dashboard';
    const isRidesTab = isDashboard && (!currentTab || currentTab === 'rides' || currentTab === 'my-rides' || currentTab === 'search');
    const isCommunitiesTab = isDashboard && currentTab === 'communities';

    const handleHomeClick = () => {
        router.push('/dashboard');
    };

    const handleCommunitiesClick = () => {
        router.push('/dashboard?tab=communities');
    };

    const handlePostClick = () => {
        setCreateRideDialogOpen(true);
    };

    const navItems = [
        { 
            icon: Home, 
            label: 'Home', 
            type: 'action' as const, 
            action: handleHomeClick,
            isActive: isRidesTab
        },
        { 
            icon: Users, 
            label: 'Communities', 
            type: 'action' as const, 
            action: handleCommunitiesClick,
            isActive: isCommunitiesTab
        },
        { 
            icon: PlusCircle, 
            label: 'Post', 
            highlight: true, 
            type: 'action' as const, 
            action: handlePostClick
        },
        { 
            icon: User, 
            label: 'Profile', 
            type: 'action' as const, 
            action: () => setProfileDialogOpen(true) 
        },
    ];

    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/70 dark:bg-background/60 backdrop-blur-xl border-t border-border/30 md:hidden pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
                <div className="flex items-center justify-around h-16 px-2">
                    {navItems.map((item, index) => {
                        const key = `nav-item-${index}`;

                        return (
                            <button
                                key={key}
                                onClick={item.action}
                                className={cn(
                                    "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                                    item.isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {item.highlight ? (
                                    <div className="relative">
                                        <item.icon
                                            className={cn(
                                                "w-7 h-7 text-primary",
                                                "bg-primary/10 rounded-full p-1.5 border border-primary/20 shadow-sm"
                                            )}
                                        />
                                    </div>
                                ) : (
                                    <item.icon className="w-6 h-6" />
                                )}
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
            <ProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />
            <CreateRideDialog 
                open={createRideDialogOpen} 
                onOpenChange={setCreateRideDialogOpen}
                onRideCreated={() => {
                    setCreateRideDialogOpen(false);
                }}
            />
        </>
    );
}
