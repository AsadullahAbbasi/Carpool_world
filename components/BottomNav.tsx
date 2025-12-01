'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import ProfileDialog from './ProfileDialog';

export default function BottomNav() {
    const pathname = usePathname();
    const [profileDialogOpen, setProfileDialogOpen] = useState(false);

    // Hide on desktop and public pages (landing, auth)
    const publicPages = ['/', '/auth', '/auth/verify-email', '/auth/reset-password'];
    const isPublicPage = publicPages.includes(pathname);

    // Don't render on public pages
    if (isPublicPage) {
        return null;
    }

    const navItems = [
        { href: '/dashboard', icon: Home, label: 'Home', type: 'link' as const },
        { href: '/dashboard', icon: Search, label: 'Find', type: 'link' as const, tab: 'search' },
        { href: '/dashboard', icon: PlusCircle, label: 'Post', highlight: true, type: 'link' as const },
        { icon: User, label: 'Profile', type: 'action' as const, action: () => setProfileDialogOpen(true) },
    ];

    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border md:hidden pb-safe">
                <div className="flex items-center justify-around h-16 px-2">
                    {navItems.map((item, index) => {
                        const isActive = item.type === 'link' && pathname === item.href;
                        const key = item.type === 'link' ? item.href : `action-${index}`;

                        if (item.type === 'action') {
                            return (
                                <button
                                    key={key}
                                    onClick={item.action}
                                    className={cn(
                                        "flex flex-col items-center justify-center w-full h-full space-y-1",
                                        "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <item.icon className="w-6 h-6" />
                                    <span className="text-[10px] font-medium">{item.label}</span>
                                </button>
                            );
                        }

                        return (
                            <Link
                                key={key}
                                href={item.href + (item.tab ? `?tab=${item.tab}` : '')}
                                className={cn(
                                    "flex flex-col items-center justify-center w-full h-full space-y-1",
                                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <item.icon
                                    className={cn(
                                        "w-6 h-6",
                                        item.highlight && "text-primary fill-primary/10 w-8 h-8 -mt-4 bg-background rounded-full p-1 border border-border shadow-sm"
                                    )}
                                />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>
            <ProfileDialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen} />
        </>
    );
}
