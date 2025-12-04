'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Navbar from '@/components/Navbar';
import RidesList from '@/components/RidesList';
import { CreateRideDialog } from '@/components/CreateRideDialog';
import CommunitiesSection from '@/components/CommunitiesSection';
import SearchBar from '@/components/SearchBar';
import { useToast } from '@/hooks/use-toast';
import { Car, Users, Search } from 'lucide-react';
import { authApi } from '@/lib/api-client';
import ProfileCompletionBanner from '@/components/ProfileCompletionBanner';

function DashboardContent() {
  const [session, setSession] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [selectedCommunityName, setSelectedCommunityName] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('rides');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Handle tab from URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['rides', 'my-rides', 'communities', 'search'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const data: any = await authApi.getCurrentUser();

        if (!data || !data.user) {
          router.push('/auth');
          return;
        }

        setSession(data.user);

        // Profile completion is now optional - users can access dashboard
        // They will be prompted to complete profile when creating a ride
      } catch (error: any) {
        router.push('/auth');
      } finally {
        // Add a minimum delay to prevent flickering
        setTimeout(() => {
          setLoading(false);
        }, 300);
      }
    };

    if (mounted) {
      checkSession();
    }
  }, [router, mounted]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      router.push('/auth');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="space-y-6">
            <div className="h-12 bg-muted/50 rounded-md animate-pulse-slow" />
            <div className="h-10 bg-muted/50 rounded-md w-1/3 animate-pulse-slow" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar onLogout={handleLogout} />

      {/* Mobile-first: responsive padding and spacing */}
      <main className="container mx-auto px-[1rem] py-[1.5rem] pb-24 max-w-7xl sm:px-[1.5rem] sm:py-[2rem] md:pb-[2rem]">
        <ProfileCompletionBanner />
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col gap-[1.5rem] sm:gap-[1.25rem]">
          {/* Touch-friendly tab list on mobile */}
          <TabsList className="grid w-full max-w-2xl grid-cols-4 h-auto p-[0.25rem]">
            <TabsTrigger value="rides" className="flex items-center gap-[0.375rem] text-sm min-h-[2.75rem] px-[0.5rem] sm:min-h-[2.5rem] sm:gap-[0.5rem] sm:text-sm">
              <Car className="w-[1.125rem] h-[1.125rem] sm:w-[1rem] sm:h-[1rem]" />
              <span className="hidden xs:inline">All Rides</span>
              <span className="xs:hidden">All</span>
            </TabsTrigger>
            <TabsTrigger value="my-rides" className="flex items-center gap-[0.375rem] text-sm min-h-[2.75rem] px-[0.5rem] sm:min-h-[2.5rem] sm:gap-[0.5rem] sm:text-sm">
              <Car className="w-[1.125rem] h-[1.125rem] sm:w-[1rem] sm:h-[1rem]" />
              <span className="hidden xs:inline">My Rides</span>
              <span className="xs:hidden">My</span>
            </TabsTrigger>
            <TabsTrigger value="communities" className="flex items-center gap-[0.375rem] text-sm min-h-[2.75rem] px-[0.5rem] sm:min-h-[2.5rem] sm:gap-[0.5rem] sm:text-sm">
              <Users className="w-[1.125rem] h-[1.125rem] sm:w-[1rem] sm:h-[1rem]" />
              <span className="hidden xs:inline">Communities</span>
              <span className="xs:hidden">Comm</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-[0.375rem] text-sm min-h-[2.75rem] px-[0.5rem] sm:min-h-[2.5rem] sm:gap-[0.5rem] sm:text-sm">
              <Search className="w-[1.125rem] h-[1.125rem] sm:w-[1rem] sm:h-[1rem]" />
              Search
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-rides" className="flex flex-col gap-[1rem]">
            {/* Mobile-first: stack on mobile, horizontal on larger screens */}
            <div className="flex flex-col gap-[1rem] sm:flex-row sm:justify-between sm:items-center">
              <h2 className="font-semibold text-[clamp(1.25rem,2.5vw+0.75rem,1.5rem)] leading-tight">My Rides</h2>
            </div>
            <RidesList
              searchQuery=""
              selectedCommunity={null}
              selectedCommunityName={null}
              filterType="all"
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
                    value={sortBy === 'date' ? 'newest' : sortBy}
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
                    <SelectContent>
                      <SelectItem value="all">All Rides</SelectItem>
                      <SelectItem value="verified">Verified Only</SelectItem>
                      <SelectItem value="offering">Offering Rides</SelectItem>
                      <SelectItem value="seeking">Seeking Rides</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <RidesList
              searchQuery={searchQuery}
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
                setSearchQuery('');
                setFilterType('all');
              }}
            />
          </TabsContent>

          <TabsContent value="communities">
            <CommunitiesSection
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
              <div className="flex gap-[0.5rem] w-full sm:w-auto">
                {/* Sort Dropdown */}
                <Select
                  value={sortBy === 'date' ? 'newest' : sortBy}
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
                  <SelectContent>
                    <SelectItem value="all">All Rides</SelectItem>
                    <SelectItem value="verified">Verified Only</SelectItem>
                    <SelectItem value="offering">Offering Rides</SelectItem>
                    <SelectItem value="seeking">Seeking Rides</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SearchBar
              onSearch={setSearchQuery}
              onCommunitySelect={(id, name) => {
                setSelectedCommunity(id);
                setSelectedCommunityName(name || null);
              }}
            />
            <div className="mt-6">
              <RidesList
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

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="space-y-6">
            <div className="h-12 bg-muted/50 rounded-md animate-pulse-slow" />
            <div className="h-10 bg-muted/50 rounded-md w-1/3 animate-pulse-slow" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
