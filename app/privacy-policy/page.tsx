'use client';

import PublicNavbar from '@/components/PublicNavbar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen">
            <PublicNavbar />

            <div className="container mx-auto px-4 pt-32 pb-20 max-w-4xl">
                <div className="mb-8">
                    <Link href="/">
                        <Button variant="ghost" className="gap-2 pl-0 hover:pl-2 transition-all">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Home
                        </Button>
                    </Link>
                </div>

                <div className="space-y-12 animate-fade-in">
                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                            User Verification & CNIC Handling Policy
                        </h1>

                    </div>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold">Why we ask for CNIC</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            RideSharee is a carpool platform, and user safety matters to us. To reduce fake accounts and misuse, we may request CNIC details during account verification.
                        </p>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold">How verification works</h2>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>CNIC information is submitted by the user voluntarily for verification purposes only.</li>
                            <li>We do not claim government-level verification or real-time NADRA checks.</li>
                            <li>Verification is limited to basic validation (format, clarity, and uniqueness) to help prevent duplicate or fake profiles.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold">Data storage & access</h2>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>CNIC data is not publicly visible to other users.</li>
                            <li>Access is restricted and limited to verification purposes only.</li>
                            <li>We do not sell, share, or use CNIC data for marketing or third-party services.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold">Data retention</h2>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>CNIC information is retained only as long as necessary for account verification and platform safety.</li>
                            <li>Users may request deletion of their CNIC data by contacting us.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold">User responsibility & safety</h2>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>RideSharee does not guarantee the identity or behavior of any user.</li>
                            <li>Users are advised to independently verify the person they choose to travel with and make their own safety decisions.</li>
                        </ul>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-2xl font-bold">Beta disclaimer</h2>
                        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            <li>RideSharee is currently in beta.</li>
                            <li>While we take reasonable steps to improve safety, users participate at their own discretion.</li>
                        </ul>
                    </section>


                </div>
            </div>
        </div>
    );
}
