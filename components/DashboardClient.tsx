'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/Navbar';
import RidesList from '@/components/RidesList';
import CommunitiesSection from '@/components/CommunitiesSection';
import SearchBar from '@/components/SearchBar';
import { CreateRideDialog } from '@/components/CreateRideDialog';
import { useToast } from '@/hooks/use-toast';
import { Car, Users, Search, Plus } from 'lucide-react';
import { authApi } from '@/lib/api-client';
import ProfileCompletionBanner from '@/components/ProfileCompletionBanner';

interface ServerUser {
  id: string;
  email: string;
  emailVerified: boolean;
}

interface ServerProfile {
  id: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  gender?: string;
  nicNumber?: string;
  nicVerified?: boolean;
  disableAutoExpiry?: boolean;
}

interface ServerRide {
  id: string;
  type: string;
  gender_preference?: string;
  start_location: string;
  end_location: string;
  ride_date: string;
  ride_time: string;
  seats_available?: number;
  description?: string;
  phone?: string;
  expires_at: string;
  is_archived?: boolean;
  user_id: string;
  created_at: string;
  updated_at?: string;
  community_id?: string | null;
  recurring_days?: string[] | null;
  profiles?: {
    full_name: string;
    nic_verified?: boolean;
  } | null;
}

interface ServerCommunity {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface DashboardClientProps {
  initialUser: ServerUser | null;
  initialProfile: ServerProfile | null;
  initialRides: ServerRide[];
  initialMyRides: ServerRide[];
  initialCommunities: ServerCommunity[];
  initialUserCommunities: string[];
}

function DashboardContent({
  initialUser,
  initialProfile,
  initialRides,
  initialMyRides,
  initialCommunities,
  initialUserCommunities,
}: DashboardClientProps) {
  const [session, setSession] = useState<ServerUser | null>(initialUser);
  const [profile, setProfile] = useState<ServerProfile | null>(initialProfile);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [selectedCommunityName, setSelectedCommunityName] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('communities');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const router = useRouter();
  const { toast } = useToast();
  const isInitialLoadRef = useRef(true);

  // Handle tab from URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['rides', 'my-rides', 'communities', 'search'].includes(tabParam)) {
      setActiveTab(tabParam);
      // Clear the tab parameter from URL so refreshing goes back to communities
      setTimeout(() => {
        router.replace('/dashboard', { scroll: false });
      }, 100);
    }
  }, [searchParams, router]);

  // Set default tab on initial load
  useEffect(() => {
    if (isInitialLoadRef.current) {
      const tabParam = searchParams.get('tab');
      if (!tabParam || !['rides', 'my-rides', 'communities', 'search'].includes(tabParam)) {
        setActiveTab('communities');
      }
      isInitialLoadRef.current = false;
    }
  }, []); // Only run on mount

  // Check authentication status when page loads or regains focus
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const data: any = await authApi.getCurrentUser();
        if (data && data.user) {
          setSession(data.user);
          setProfile(data.profile);
        } else {
          setSession(null);
          setProfile(null);
        }
      } catch (error) {
        // User is not authenticated
        setSession(null);
        setProfile(null);
      }
    };

    // Check on mount
    checkAuthStatus();

    // Check when window regains focus (user returns from auth page)
    const handleFocus = () => {
      checkAuthStatus();
    };

    // Check when navigating back to the page
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkAuthStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      setSession(null);
      setProfile(null);

      // Stay on dashboard (dashboard is public), but ensure we are not on an auth-only tab.
      if (activeTab === 'my-rides') {
        setActiveTab('rides');
      }

      // Clean URL (and prevent navigating away)
      router.replace('/dashboard', { scroll: false });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onLogout={handleLogout} isAuthenticated={!!session} />

      {/* Mobile-first: responsive padding and spacing */}
      <main className="container mx-auto px-[1rem] py-[1.5rem] pb-24 max-w-7xl sm:px-[1.5rem] sm:py-[2rem] md:pb-[2rem]">
        {session && <ProfileCompletionBanner />}
        <div className="mb-[1.5rem] sm:mb-[2rem]">
          {/* Fluid heading with gradient */}
          <h1 className="font-bold mb-[0.5rem] bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent text-[clamp(1.75rem,4vw+1rem,2.5rem)] leading-tight">
            Find Your Ride
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed sm:text-sm sm:leading-normal">
            Connect with your community and share rides
          </p>
        </div>

        {/* Mobile-first tabs with adequate spacing */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            if (value === 'communities') {
              // Reset search context when returning to communities tab
              setSelectedCommunity(null);
              setSelectedCommunityName(null);
            }
          }}
          className="flex flex-col gap-[1.5rem] sm:gap-[1.25rem]"
        >
          {/* Touch-friendly tab list on mobile */}
          <TabsList className={`grid w-full max-w-2xl h-auto p-[0.25rem] ${session ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="rides" className="flex min-w-0 items-center gap-[0.375rem] text-sm min-h-[2.75rem] px-[0.5rem] sm:min-h-[2.5rem] sm:gap-[0.5rem] sm:text-sm">
              <Car className="w-[1.125rem] h-[1.125rem] sm:w-[1rem] sm:h-[1rem]" />
              <span className="truncate max-w-[5.5rem] md:max-w-none md:[overflow:visible] md:[text-overflow:clip] md:whitespace-nowrap">All Rides</span>
            </TabsTrigger>
            {session && (
              <TabsTrigger value="my-rides" className="flex min-w-0 items-center gap-[0.375rem] text-sm min-h-[2.75rem] px-[0.5rem] sm:min-h-[2.5rem] sm:gap-[0.5rem] sm:text-sm">
                <Car className="w-[1.125rem] h-[1.125rem] sm:w-[1rem] sm:h-[1rem]" />
                <span className="truncate max-w-[5.5rem] md:max-w-none md:[overflow:visible] md:[text-overflow:clip] md:whitespace-nowrap">My Rides</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="communities" className="flex min-w-0 items-center gap-[0.375rem] text-sm min-h-[2.75rem] px-[0.5rem] sm:min-h-[2.5rem] sm:gap-[0.5rem] sm:text-sm">
              <Users className="w-[1.125rem] h-[1.125rem] sm:w-[1rem] sm:h-[1rem]" />
              <span className="truncate max-w-[6.5rem] md:max-w-none md:[overflow:visible] md:[text-overflow:clip] md:whitespace-nowrap">Communities</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex min-w-0 items-center gap-[0.375rem] text-sm min-h-[2.75rem] px-[0.5rem] sm:min-h-[2.5rem] sm:gap-[0.5rem] sm:text-sm">
              <Search className="w-[1.125rem] h-[1.125rem] sm:w-[1rem] sm:h-[1rem]" />
              <span className="truncate max-w-[6rem] md:max-w-none md:[overflow:visible] md:[text-overflow:clip] md:whitespace-nowrap">Search Rides</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-rides" className="flex flex-col gap-[1rem]">
            {/* Mobile-first: stack on mobile, horizontal on larger screens */}
            <div className="flex flex-col gap-[1rem] sm:flex-row sm:justify-between sm:items-center">
              <h2 className="font-semibold text-[clamp(1.25rem,2.5vw+0.75rem,1.5rem)] leading-tight">My Rides</h2>
              <CreateRideDialog>
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Ride
                </Button>
              </CreateRideDialog>
            </div>
            <RidesList
              initialRides={initialMyRides}
              initialUser={session}
              searchQuery=""
              selectedCommunity={null}
              selectedCommunityName={null}
              filterType="all"
              sortBy="newest"
              showFilter={false}
              showOnlyMyRides={true}
            />
          </TabsContent>

          <TabsContent value="rides" className="flex flex-col gap-[1rem]">
            {/* Mobile-first: stack on mobile, horizontal on larger screens */}
            <div className="flex flex-col gap-[1rem] sm:flex-row sm:justify-between sm:items-center">
              <h2 className="font-semibold text-[clamp(1.25rem,2.5vw+0.75rem,1.5rem)] leading-tight">All Rides</h2>
              {/* Mobile: filters on same row, button below. Desktop: all in same row */}
              <div className="flex flex-col gap-[0.75rem] w-full sm:flex-row sm:items-center sm:gap-[0.5rem] sm:w-auto">
                {/* Two dropdowns side-by-side on mobile and desktop */}
                <div className="flex gap-[0.5rem] w-full sm:w-auto">
                  {/* Sort Dropdown */}
                  <Select
                    value={sortBy}
                    onValueChange={(value) => {
                      setSortBy(value);
                    }}
                  >
                    <SelectTrigger className="flex-1 sm:w-[140px]">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      className='max-h-[200px] lg:max-h-[250px] overflow-y-scroll'
                      align="start"
                      sideOffset={4}
                      avoidCollisions={false}
                    >
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Filter Dropdown */}
                  <Select
                    value={filterType}
                    onValueChange={(value) => {
                      setFilterType(value);
                    }}
                  >
                    <SelectTrigger className="flex-1 sm:w-[160px]">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      side="bottom"
                      align="center"
                      sideOffset={4}
                      avoidCollisions={false}
                      className='max-h-[200px] lg:max-h-[250px] overflow-y-scroll'
                    >
                      <SelectItem value="all">All Rides</SelectItem>
                      <SelectItem value="verified">Verified Only</SelectItem>
                      <SelectItem value="offering">Offering Rides</SelectItem>
                      <SelectItem value="seeking">Seeking Rides</SelectItem>
                      <SelectItem value="girls_only">Girls Only</SelectItem>
                      <SelectItem value="boys_only">Boys Only</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <CreateRideDialog>
                  <Button className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Ride
                  </Button>
                </CreateRideDialog>
              </div>
            </div>
            <RidesList
              initialRides={initialRides}
              initialUser={session}
              searchQuery=""
              selectedCommunity={null}
              selectedCommunityName={null}
              filterType={filterType}
              onFilterTypeChange={setFilterType}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              showFilter={false}
              onClearCommunity={() => {
                setFilterType('all');
              }}
              onClearFilters={() => {
                setFilterType('all');
              }}
            />
          </TabsContent>

          <TabsContent value="communities">
            <CommunitiesSection
              initialCommunities={initialCommunities}
              initialUserCommunities={initialUserCommunities}
              initialUser={session}
              selectedCommunity={selectedCommunity}
              selectedCommunityName={selectedCommunityName}
              onSelectCommunity={(id, name) => {
                setSelectedCommunity(id);
                setSelectedCommunityName(name || null);
                // Don't switch tabs - stay in communities tab
              }}
              onBackToCommunities={() => {
                setSelectedCommunity(null);
                setSelectedCommunityName(null);
              }}
            />
          </TabsContent>

          <TabsContent value="search">
            {/* Mobile-first: adequate spacing */}
            <div className="flex flex-col gap-[1rem] sm:flex-row sm:justify-between sm:items-center mb-[1rem]">
              <h2 className="font-semibold text-[clamp(1.25rem,2.5vw+0.75rem,1.5rem)] leading-tight">Search Rides</h2>
              {/* Two dropdowns side-by-side */}
              <div className="flex flex-col gap-[0.75rem] w-full sm:flex-row sm:items-center sm:gap-[0.5rem] sm:w-auto">
                <div className="flex gap-[0.5rem] w-full sm:w-auto">
                  {/* Sort Dropdown */}
                  <Select
                    value={sortBy}
                    onValueChange={(value) => {
                      setSortBy(value);
                    }}
                  >
                    <SelectTrigger className="flex-1 sm:w-[140px]">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                  {/* Filter Dropdown */}
                  <Select
                    value={filterType}
                    onValueChange={(value) => {
                      setFilterType(value);
                    }}
                  >
                    <SelectTrigger className="flex-1 sm:w-[160px]">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent className='!overflow-y-auto !max-h-[15rem]' position="popper" side="bottom" align="start" sideOffset={4}>
                      <SelectItem value="all">All Rides</SelectItem>
                      <SelectItem value="verified">Verified Only</SelectItem>
                      <SelectItem value="offering">Offering Rides</SelectItem>
                      <SelectItem value="seeking">Seeking Rides</SelectItem>
                      <SelectItem value="girls_only">Girls Only</SelectItem>
                      <SelectItem value="boys_only">Boys Only</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <CreateRideDialog>
                  <Button className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Ride
                  </Button>
                </CreateRideDialog>
              </div>
            </div>
            <SearchBar
              initialCommunities={initialCommunities}
              onSearch={setSearchQuery}
              onCommunitySelect={(id, name) => {
                setSelectedCommunity(id);
                setSelectedCommunityName(name || null);
              }}
            />
            <div className="mt-6">
              <RidesList
                initialRides={[]}
                initialUser={session}
                searchQuery={searchQuery}
                selectedCommunity={selectedCommunity}
                selectedCommunityName={selectedCommunityName}
                filterType={filterType}
                onFilterTypeChange={setFilterType}
                sortBy={sortBy}
                onSortByChange={setSortBy}
                showFilter={false}
                onClearCommunity={() => {
                  setSelectedCommunity(null);
                  setSelectedCommunityName(null);
                }}
                onClearFilters={() => {
                  setSelectedCommunity(null);
                  setSelectedCommunityName(null);
                  setSearchQuery('');
                  setFilterType('all');
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// Wrapper component with Suspense for useSearchParams
export default function DashboardClient(props: DashboardClientProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="space-y-6">
            <div className="h-12 bg-muted/50 rounded-md animate-pulse-slow" />
            <div className="h-10 bg-muted/50 rounded-md w-1/3 animate-pulse-slow" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="h-20 bg-muted rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    }>
      <DashboardContent {...props} />
    </Suspense>
  );
}

