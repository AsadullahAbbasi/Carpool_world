'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectLabel, SelectSeparator, SelectGroup } from '@/components/ui/select';
import Navbar from '@/components/Navbar';
import RidesList from '@/components/RidesList';
import { CreateRideDialog } from '@/components/CreateRideDialog';
import CommunitiesSection from '@/components/CommunitiesSection';
import SearchBar from '@/components/SearchBar';
import { useToast } from '@/hooks/use-toast';
import { Car, Users, Search } from 'lucide-react';
import { authApi } from '@/lib/api-client';
import ProfileCompletionBanner from '@/components/ProfileCompletionBanner';

export default function DashboardPage() {
  const [session, setSession] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [selectedCommunityName, setSelectedCommunityName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('rides');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

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

        // Check if profile is complete (NIC verification is optional)
        if (data.profile && (!data.profile.fullName || !data.profile.phone || !data.profile.avatarUrl || !data.profile.gender)) {
          router.push('/profile-completion');
          return;
        }
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

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <ProfileCompletionBanner />
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Find Your Ride
          </h1>
          <p className="text-muted-foreground">
            Connect with your community and share rides
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="rides" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Car className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">All Rides</span>
              <span className="xs:hidden">All</span>
            </TabsTrigger>
            <TabsTrigger value="my-rides" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Car className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">My Rides</span>
              <span className="xs:hidden">My</span>
            </TabsTrigger>
            <TabsTrigger value="communities" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Communities</span>
              <span className="xs:hidden">Comm</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Search className="w-3 h-3 sm:w-4 sm:h-4" />
              Search
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-rides" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-semibold">My Rides</h2>
              <CreateRideDialog
                onRideCreated={(ride) => {
                  const event = new CustomEvent('rideCreated', { detail: ride });
                  window.dispatchEvent(event);
                }}
              />
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

          <TabsContent value="rides" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-2xl font-semibold">All Rides</h2>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select
                  value={`${sortBy}-${filterType}`}
                  onValueChange={(value) => {
                    const [newSortBy, newFilterType] = value.split('-');
                    setSortBy(newSortBy);
                    setFilterType(newFilterType);
                  }}
                >
                  <SelectTrigger className="w-[200px] sm:w-[220px]">
                    <SelectValue placeholder="Filter & Sort" />
                  </SelectTrigger>
                  <SelectContent
                    side="bottom"
                    align="start"
                    sideOffset={4}
                    avoidCollisions={false}
                    className="max-h-[300px] overflow-y-auto"
                  >
                    <SelectGroup>
                      <SelectLabel>All Rides</SelectLabel>
                      <SelectItem value="newest-all">Newest First - All</SelectItem>
                      <SelectItem value="oldest-all">Oldest First - All</SelectItem>
                      <SelectItem value="date-all">Ride Date - All</SelectItem>
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>Verified Only</SelectLabel>
                      <SelectItem value="newest-verified">Newest First - Verified</SelectItem>
                      <SelectItem value="oldest-verified">Oldest First - Verified</SelectItem>
                      <SelectItem value="date-verified">Ride Date - Verified</SelectItem>
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>Offering Rides</SelectLabel>
                      <SelectItem value="newest-offering">Newest First - Offering</SelectItem>
                      <SelectItem value="oldest-offering">Oldest First - Offering</SelectItem>
                      <SelectItem value="date-offering">Ride Date - Offering</SelectItem>
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>Seeking Rides</SelectLabel>
                      <SelectItem value="newest-seeking">Newest First - Seeking</SelectItem>
                      <SelectItem value="oldest-seeking">Oldest First - Seeking</SelectItem>
                      <SelectItem value="date-seeking">Ride Date - Seeking</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <CreateRideDialog
                  onRideCreated={(ride) => {
                    // Trigger refresh in RidesList
                    const event = new CustomEvent('rideCreated', { detail: ride });
                    window.dispatchEvent(event);
                  }}
                />
              </div>
            </div>
            <RidesList
              searchQuery={searchQuery}
              selectedCommunity={null}
              selectedCommunityName={null}
              filterType={filterType === 'verified' ? 'verified' : filterType === 'offering' ? 'offering' : filterType === 'seeking' ? 'seeking' : 'all'}
              onFilterTypeChange={(type) => {
                // Extract sortBy and filterType from the combined value
                if (type.includes('-')) {
                  const [newSortBy, newFilterType] = type.split('-');
                  setSortBy(newSortBy);
                  setFilterType(newFilterType);
                } else {
                  setFilterType(type);
                }
              }}
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <h2 className="text-2xl font-semibold">Search Rides</h2>
              <div className="w-full sm:w-auto">
                <Select
                  value={`${sortBy}-${filterType}`}
                  onValueChange={(value) => {
                    const [newSortBy, newFilterType] = value.split('-');
                    setSortBy(newSortBy);
                    setFilterType(newFilterType);
                  }}
                >
                  <SelectTrigger className="w-[200px] sm:w-[220px]">
                    <SelectValue placeholder="Filter & Sort" />
                  </SelectTrigger>
                  <SelectContent
                    side="bottom"
                    align="start"
                    sideOffset={4}
                    avoidCollisions={false}
                    className="max-h-[300px] overflow-y-auto"
                  >
                    <SelectGroup>
                      <SelectLabel>All Rides</SelectLabel>
                      <SelectItem value="newest-all">Newest First - All</SelectItem>
                      <SelectItem value="oldest-all">Oldest First - All</SelectItem>
                      <SelectItem value="date-all">Ride Date - All</SelectItem>
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>Verified Only</SelectLabel>
                      <SelectItem value="newest-verified">Newest First - Verified</SelectItem>
                      <SelectItem value="oldest-verified">Oldest First - Verified</SelectItem>
                      <SelectItem value="date-verified">Ride Date - Verified</SelectItem>
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>Offering Rides</SelectLabel>
                      <SelectItem value="newest-offering">Newest First - Offering</SelectItem>
                      <SelectItem value="oldest-offering">Oldest First - Offering</SelectItem>
                      <SelectItem value="date-offering">Ride Date - Offering</SelectItem>
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectLabel>Seeking Rides</SelectLabel>
                      <SelectItem value="newest-seeking">Newest First - Seeking</SelectItem>
                      <SelectItem value="oldest-seeking">Oldest First - Seeking</SelectItem>
                      <SelectItem value="date-seeking">Ride Date - Seeking</SelectItem>
                    </SelectGroup>
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
                filterType={filterType === 'verified' ? 'verified' : filterType === 'offering' ? 'offering' : filterType === 'seeking' ? 'seeking' : 'all'}
                onFilterTypeChange={(type) => {
                  if (type.includes('-')) {
                    const [newSortBy, newFilterType] = type.split('-');
                    setSortBy(newSortBy);
                    setFilterType(newFilterType);
                  } else {
                    setFilterType(type);
                  }
                }}
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
