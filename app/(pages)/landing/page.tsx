'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, Users, Shield, Clock, MapPin, ArrowRight, CheckCircle2, Star, Calendar } from 'lucide-react';
import PublicNavbar from '@/components/PublicNavbar';
import { format } from 'date-fns';
import { authApi } from '@/lib/api-client';

// Dummy data for when API fails or no data available
const DUMMY_RIDES = [
  {
    id: 'dummy-1',
    type: 'offering',
    start_location: 'DHA Phase 5',
    end_location: 'Gulshan-e-Iqbal',
    ride_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    ride_time: '09:00',
    seats_available: 3,
    profiles: { full_name: 'Ahmed Khan', nic_verified: true },
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dummy-2',
    type: 'offering',
    start_location: 'Bahria Town',
    end_location: 'Faisalabad',
    ride_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    ride_time: '14:30',
    seats_available: 2,
    profiles: { full_name: 'Fatima Ali', nic_verified: true },
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'dummy-3',
    type: 'offering',
    start_location: 'Model Town',
    end_location: 'Airport',
    ride_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    ride_time: '06:00',
    seats_available: 4,
    profiles: { full_name: 'Hassan Malik', nic_verified: false },
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const DUMMY_COMMUNITIES = [
  {
    id: 'dummy-comm-1',
    name: 'Fast University Community',
    description: 'Connect with students and staff from universities in Lahore',
    member_count: 245,
  },
  {
    id: 'dummy-comm-2',
    name: 'IBA Daily Commute',
    description: 'Daily commute rides in Karachi metropolitan area',
    member_count: 189,
  },
  {
    id: 'dummy-comm-3',
    name: 'Islamabad Tech Park',
    description: 'Rides for professionals working in tech parks and offices',
    member_count: 156,
  },
];

export default function LandingPage() {
  const router = useRouter();
  // Always show dummy data - no database fetching
  const featuredRides = DUMMY_RIDES;
  const communities = DUMMY_COMMUNITIES;
  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const data: any = await authApi.getCurrentUser();
        if (!cancelled && data?.user) {
          router.replace('/dashboard');
        }
      } catch {
        // not logged in, just stay on landing page
      }
    };

    // Check on mount
    check();

    // Also check if user returns here via back button/tab focus
    const handleFocus = () => check();
    const handleVisibilityChange = () => {
      if (!document.hidden) check();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);

  return (
    <div
      className="min-h-screen"
    >
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 animate-fade-in">
        <div className=" mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            <h1 className=" md:text-6xl lg:text-7xl font-bold tracking-tight">
              Share Rides.
              <br />
              Build Community.
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Connect with your community, save on travel costs, and reduce your carbon footprint.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Button
                size="lg"
                className="text-lg w-full  md:px-8 py-3"
                onClick={() => router.push('/dashboard?tab=rides')}
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg w-full md:px-8 py-3 border-foreground/20"
                onClick={() => router.push('/dashboard?tab=rides')}
              >
                Browse Rides
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Rides Section */}
      <section className="py-20 md:px-4 ">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Featured Rides</h2>
            <p className="text-muted-foreground text-lg mx-auto">
              Recent rides from our community
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featuredRides.slice(0, 3).map((ride) => (
              <Card
                key={ride.id}
                className="hover:shadow-medium transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                onClick={() => router.push('/dashboard?tab=rides')}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge variant={ride.type === 'offering' ? 'default' : 'secondary'}>
                          {ride.type === 'offering' ? 'Offering Ride' : 'Seeking Ride'}
                        </Badge>
                        {ride.profiles && !ride.profiles.nic_verified && (
                          <Badge variant="outline" className="text-xs">
                            NIC Not Verified
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Posted by {ride.profiles?.full_name || 'Community Member'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-medium">{ride.start_location}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium">{ride.end_location}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(ride.ride_date), 'MMM dd, yyyy')}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {ride.ride_time}
                    </div>
                  </div>
                  {ride.seats_available && (
                    <div className="flex items-center gap-1 text-sm">
                      <Users className="w-4 h-4 text-accent" />
                      <span>{ride.seats_available} seats available</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" onClick={() => router.push('/dashboard?tab=rides')}>
              View All Rides
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>



      {/* Communities Preview */}
      <section className="py-20 md:px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Communities</h2>
            <p className="text-muted-foreground text-lg mx-auto">
              Join communities and connect with people in your area
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {communities.slice(0, 3).map((community) => (
              <Card
                key={community.id}
                className="hover:shadow-medium transition-all duration-200 hover:scale-[1.02] cursor-pointer"
                onClick={() => router.push('/dashboard?tab=communities')}
              >
                <CardHeader>
                  <CardTitle>{community.name}</CardTitle>
                  <CardDescription>{community.description || 'No description'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    {community.member_count || 0} members
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button variant="outline" onClick={() => router.push('/dashboard?tab=communities')}>
              Browse Communities
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Student Perks Section */}
      <section className="py-20 md:px-4 ">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Student Exclusive Perks</h2>
            <p className="text-muted-foreground text-lg mx-auto">
              Designed specifically for university students
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <Card className="bg-background border-primary/20">
              <CardHeader>
                <Badge className="w-fit mb-4">Save Money</Badge>
                <CardTitle>Student Discounts</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Get special rates on rides to and from your university campus. Verify your student ID to unlock.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="bg-background border-primary/20">
              <CardHeader>
                <Badge className="w-fit mb-4">Safety First</Badge>
                <CardTitle>Verified Drivers</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  All drivers are NIC verified. See which university they attend for extra peace of mind.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="bg-background border-primary/20">
              <CardHeader>
                <Badge className="w-fit mb-4">Community</Badge>
                <CardTitle>Group Rides</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Travel with friends or make new ones. Create groups for your daily commute.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>



      {/* Features Section */}
      <section className="py-20 md:px-4 ">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Why Choose Us</h2>
            <p className="text-muted-foreground text-lg mx-auto">
              Everything you need to share rides safely and efficiently
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border hover:shadow-medium transition-all duration-200">
              <CardHeader>
                <Shield className="w-10 h-10 mb-4" />
                <CardTitle>Safe & Verified</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  NIC verification and community-based trust system ensure safe rides.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-border hover:shadow-medium transition-all duration-200">
              <CardHeader>
                <Clock className="w-10 h-10 mb-4" />
                <CardTitle>Save Time</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Find rides that match your schedule. No more waiting for public transport.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-border hover:shadow-medium transition-all duration-200">
              <CardHeader>
                <MapPin className="w-10 h-10 mb-4" />
                <CardTitle>Local Communities</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Connect with people in your area. Build lasting relationships.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-border hover:shadow-medium transition-all duration-200">
              <CardHeader>
                <Car className="w-10 h-10 mb-4" />
                <CardTitle>Easy to Use</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Simple interface. Post or find rides in minutes.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-border hover:shadow-medium transition-all duration-200">
              <CardHeader>
                <Users className="w-10 h-10 mb-4" />
                <CardTitle>Community Driven</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Built by the community, for the community. Your feedback shapes our platform.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="border-border hover:shadow-medium transition-all duration-200">
              <CardHeader>
                <CheckCircle2 className="w-10 h-10 mb-4" />
                <CardTitle>Reliable</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Review system and verified profiles help you make informed decisions.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>


      {/* Testimonials */}
      <section className="py-20 md:px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">What People Say</h2>
            <p className="text-muted-foreground text-lg mx-auto">
              Trusted by thousands of users across Pakistan
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-foreground text-foreground" />
                  ))}
                </div>
                <CardDescription>
                  "This platform has made my daily commute so much easier. Great community!"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-semibold">Ahmed K.</p>
                <p className="text-sm text-muted-foreground">Lahore</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-foreground text-foreground" />
                  ))}
                </div>
                <CardDescription>
                  "Safe, reliable, and saves me money. Highly recommend!"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-semibold"> Fatima S.</p>
                <p className="text-sm text-muted-foreground">Karachi</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 fill-foreground text-foreground" />
                  ))}
                </div>
                <CardDescription>
                  "The verification system gives me peace of mind. Great platform!"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-semibold"> Hassan M.</p>
                <p className="text-sm text-muted-foreground">Islamabad</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {/* FINAL CTA – Works perfectly in both light & dark mode */}
      <section className="py-20 px-4 bg-black dark:bg-black text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 text-white/80 max-w-2xl mx-auto">
            Join thousands of users sharing rides and building community.
          </p>
          <Button
            size="lg"
            className="text-lg px-8 py-3 bg-white text-black hover:bg-white/90 font-medium shadow-xl"
            onClick={() => router.push('/dashboard')}
          >
            Browse Rides
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-8 
                   grid-cols-1           /* 1 col on <640px */
                   sm:grid-cols-2        /* 2 col from 640px up */
                   lg:grid-cols-4">      {/* 4 col from 1024px up */}

            {/* Logo + description */}
            <div className="col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 relative flex items-center justify-center">
                  {/* Light mode */}
                  <Image
                    src="/RideShare_Logo.png"
                    alt="RideShare Logo"
                    width={32}
                    height={32}
                    className="w-full h-full object-contain dark:hidden"
                  />
                  {/* Dark mode */}
                  <Image
                    src="/nightLogo.png"
                    alt="RideShare Logo"
                    width={32}
                    height={32}
                    className="w-full h-full object-contain hidden dark:block"
                  />
                </div>
                <span className="text-xl font-bold">RideShare</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Connecting communities through shared rides.
              </p>
            </div>

            {/* Product */}
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/dashboard?tab=rides" className="hover:text-foreground transition-colors">Browse Rides</Link></li>
                <li><Link href="/dashboard?tab=communities" className="hover:text-foreground transition-colors">Communities</Link></li>
                <li><Link href="/dashboard?tab=rides" className="hover:text-foreground transition-colors">Post a Ride</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Privacy</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Terms</Link></li>
              </ul>
            </div>

            {/* Support – will sit next to Company on mobile */}
            <div className="sm:col-span-2 lg:col-span-1">
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground transition-colors">Help Center</Link></li>
                <li><Link href="#" className="hover:text-foreground transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 pt-8  flex justify-center items-center">
            <p className="text-sm text-muted-foreground text-center">
              &copy; {new Date().getFullYear()} RideShare. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

