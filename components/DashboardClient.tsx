'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Navbar from '@/components/Navbar';
import RidesList from '@/components/RidesList';
import CommunitiesSection from '@/components/CommunitiesSection';
import SearchBar from '@/components/SearchBar';
import { CreateRideDialog } from '@/components/CreateRideDialog';
import { useToast } from '@/hooks/use-toast';
import { Car, Users, Search, Plus } from 'lucide-react';
import { authApi } from '@/lib/api-client';
import ProfileCompletionBanner from '@/components/ProfileCompletionBanner';
import { Skeleton } from '@/components/ui/skeleton';

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
    disable_auto_expiry?: boolean;
  } | null;
}

interface ServerCommunity {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  memberCount: number;
  rideCount: number;
}

interface DashboardClientProps {
  initialUser: ServerUser | null;
  initialProfile: ServerProfile | null;
  initialRides: ServerRide[];
  initialMyRides: ServerRide[];
  initialCommunities: ServerCommunity[];
  initialUserCommunities: string[];
}

function ContentSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </div>
  );
}

function DashboardContent({
  initialUser,
  initialProfile,
  initialRides,
  initialMyRides,
  initialCommunities,
  initialUserCommunities,
}: DashboardClientProps) {
  const searchParams = useSearchParams();
  const [session, setSession] = useState<ServerUser | null>(initialUser);
  const [profile, setProfile] = useState<ServerProfile | null>(initialProfile);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [selectedCommunityName, setSelectedCommunityName] = useState<string | null>(null);
  // Initialize from URL or default to 'communities'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'communities');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const router = useRouter();
  const { toast } = useToast();

  // Sync active tab → URL (only when user changes tab)
  useEffect(() => {
    const currentTabParam = searchParams.get('tab');

    // Only update URL if it doesn't match current state (and state isn't default 'communities' with no param)
    if (currentTabParam !== activeTab) {
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set('tab', activeTab);
      router.push(`/dashboard?${newParams.toString()}`, { scroll: false });
    }
  }, [activeTab, searchParams, router]);

  // Handle manual tab clicks
  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return;

    setActiveTab(newTab);

    if (newTab !== 'communities') {
      setSelectedCommunity(null);
      setSelectedCommunityName(null);
    }
  };

  // Auth check (unchanged)
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
        setSession(null);
        setProfile(null);
      }
    };

    checkAuthStatus();

    const handleFocus = () => checkAuthStatus();
    const handleVisibilityChange = () => {
      if (!document.hidden) checkAuthStatus();
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

      if (activeTab === 'my-rides') {
        setActiveTab('rides');
      }

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

      <main className="container mx-auto px-[1rem] py-[1.5rem] pb-24 max-w-7xl sm:px-[1.5rem] sm:py-[2rem] md:pb-[2rem]">
        {session && <ProfileCompletionBanner />}

        <div className="mb-[1.5rem] sm:mb-[2rem]">
          <h1 className="font-bold mb-[0.5rem] bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent text-[clamp(1.75rem,4vw+1rem,2.5rem)] leading-tight">
            Find Your Ride
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed sm:text-sm sm:leading-normal">
            Connect with your community and share rides
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-col gap-[1.5rem] sm:gap-[1.25rem]">
          <TabsList className={`grid w-full max-w-2xl h-auto p-[0.25rem] ${session ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <TabsTrigger value="rides" className="flex min-w-0 items-center gap-[0.375rem] text-sm min-h-[2.75rem] px-[0.5rem] sm:min-h-[2.5rem] sm:gap-[0.5rem] sm:text-sm">
              <Car className="w-[1.125rem] h-[1.125rem] sm:w-[1rem] sm:h-[1rem]" />
              <span className="truncate max-w-[5.5rem] md:max-w-none">All Rides</span>
            </TabsTrigger>
            {session && (
              <TabsTrigger value="my-rides" className="flex min-w-0 items-center gap-[0.375rem] text-sm min-h-[2.75rem] px-[0.5rem] sm:min-h-[2.5rem] sm:gap-[0.5rem] sm:text-sm">
                <Car className="w-[1.125rem] h-[1.125rem] sm:w-[1rem] sm:h-[1rem]" />
                <span className="truncate max-w-[5.5rem] md:max-w-none">My Rides</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="communities" className="flex min-w-0 items-center gap-[0.375rem] text-sm min-h-[2.75rem] px-[0.5rem] sm:min-h-[2.5rem] sm:gap-[0.5rem] sm:text-sm">
              <Users className="w-[1.125rem] h-[1.125rem] sm:w-[1rem] sm:h-[1rem]" />
              <span className="truncate max-w-[6.5rem] md:max-w-none">Communities</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex min-w-0 items-center gap-[0.375rem] text-sm min-h-[2.75rem] px-[0.5rem] sm:min-h-[2.5rem] sm:gap-[0.5rem] sm:text-sm">
              <Search className="w-[1.125rem] h-[1.125rem] sm:w-[1rem] sm:h-[1rem]" />
              <span className="truncate max-w-[6rem] md:max-w-none">Search Rides</span>
            </TabsTrigger>
          </TabsList>

          <Suspense fallback={<ContentSkeleton count={activeTab === 'my-rides' ? 1 : 6} />}>
            {/* All TabsContent remain exactly the same as in previous fast version */}
            <TabsContent value="my-rides" forceMount={true} className="flex flex-col gap-[1rem] data-[state=inactive]:hidden">
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

            <TabsContent value="rides" forceMount={true} className="flex flex-col gap-[1rem] data-[state=inactive]:hidden">
              <div className="flex flex-col gap-[1rem] sm:flex-row sm:justify-between sm:items-center">
                <h2 className="font-semibold text-[clamp(1.25rem,2.5vw+0.75rem,1.5rem)] leading-tight">All Rides</h2>
                <div className="flex flex-col gap-[0.75rem] w-full sm:flex-row sm:items-center sm:gap-[0.5rem] sm:w-auto">
                  <div className="flex gap-[0.5rem] w-full sm:w-auto">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="flex-1 sm:w-[140px] text-sm">
                        <SelectValue placeholder="Sort" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="flex-1 sm:w-[160px]">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] overflow-y-auto">
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
                onClearCommunity={() => setFilterType('all')}
                onClearFilters={() => setFilterType('all')}
              />
            </TabsContent>

            <TabsContent value="communities" forceMount={true} className="data-[state=inactive]:hidden">
              <CommunitiesSection
                initialCommunities={initialCommunities}
                initialUserCommunities={initialUserCommunities}
                initialUser={session}
                selectedCommunity={selectedCommunity}
                selectedCommunityName={selectedCommunityName}
                onSelectCommunity={(id, name) => {
                  setSelectedCommunity(id);
                  setSelectedCommunityName(name || null);
                }}
                onBackToCommunities={() => {
                  setSelectedCommunity(null);
                  setSelectedCommunityName(null);
                }}
              />
            </TabsContent>

            <TabsContent value="search" forceMount={true} className="data-[state=inactive]:hidden">
              <div className="flex flex-col gap-[1rem] sm:flex-row sm:justify-between sm:items-center mb-[1rem]">
                <h2 className="font-semibold text-[clamp(1.25rem,2.5vw+0.75rem,1.5rem)] leading-tight">Search Rides</h2>
                <div className="flex flex-col gap-[0.75rem] w-full sm:flex-row sm:items-center sm:gap-[0.5rem] sm:w-auto">
                  <div className="flex gap-[0.5rem] w-full sm:w-auto">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="flex-1 sm:w-[140px]">
                        <SelectValue placeholder="Sort" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="flex-1 sm:w-[160px]">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] overflow-y-auto">
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
                  initialRides={initialRides}
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
          </Suspense>
        </Tabs>
      </main>
    </div>
  );
}

export default function DashboardClient(props: DashboardClientProps) {
  return <DashboardContent {...props} />;
}