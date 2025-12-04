'use client';

import { useEffect, useState } from 'react';
import { ridesApi, authApi, reviewsApi } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, Phone, Trash2, Users, Pencil, Star, MessageCircle, X, Archive, RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow, differenceInHours, differenceInMinutes } from 'date-fns';
import { CreateRideDialog } from './CreateRideDialog';
import ReviewDialog from './ReviewDialog';
import ReviewsList from './ReviewsList';
import ProfileDialog from './ProfileDialog';
import { openWhatsApp } from '@/lib/whatsapp';


interface Ride {
  id: string;
  type: string;
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
  community_id?: string | null;
  recurring_days?: string[] | null;
  profiles?: {
    full_name: string;
    nic_verified?: boolean;
  } | null;
}

interface RidesListProps {
  searchQuery?: string;
  selectedCommunity?: string | null;
  selectedCommunityName?: string | null;
  onClearCommunity?: () => void;
  onClearFilters?: () => void;
  filterType?: string;
  onFilterTypeChange?: (type: string) => void;
  sortBy?: string;
  onSortByChange?: (sortBy: string) => void;
  showFilter?: boolean;
  renderFilter?: () => React.ReactNode;
  showOnlyMyRides?: boolean;
}

const RidesList = ({
  searchQuery = '',
  selectedCommunity,
  selectedCommunityName,
  onClearCommunity,
  onClearFilters,
  filterType: externalFilterType,
  onFilterTypeChange,
  sortBy: externalSortBy,
  onSortByChange,
  showFilter = true,
  renderFilter,
  showOnlyMyRides = false
}: RidesListProps) => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [allRides, setAllRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);
  const [reviewingRide, setReviewingRide] = useState<Ride | null>(null);
  const [viewingReviewsRide, setViewingReviewsRide] = useState<Ride | null>(null);
  const [existingReview, setExistingReview] = useState<any>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [internalSortBy, setInternalSortBy] = useState<string>('newest');
  const [internalFilterType, setInternalFilterType] = useState<string>('all');
  const [showingDefaultFeed, setShowingDefaultFeed] = useState(false);
  const [showUnverifiedNote, setShowUnverifiedNote] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const sortBy = externalSortBy !== undefined ? externalSortBy : internalSortBy;
  const filterType = externalFilterType !== undefined ? externalFilterType : internalFilterType;
  const handleSortByChange = onSortByChange || setInternalSortBy;
  const handleFilterTypeChange = onFilterTypeChange || setInternalFilterType;
  const { toast } = useToast();

  const getCurrentUser = async () => {
    try {
      const data: any = await authApi.getCurrentUser();
      setCurrentUserId(data.user?.id || null);

      const profile = data.profile;
      if (profile) {
        const hasRequiredFields =
          !!(profile.fullName && profile.phone && profile.gender) &&
          (profile.gender === 'female' ? true : !!profile.avatarUrl);
        setIsProfileComplete(hasRequiredFields);
      } else {
        setIsProfileComplete(false);
      }
    } catch (error) {
      setCurrentUserId(null);
      setIsProfileComplete(false);
    }
  };

  const fetchRides = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedCommunity) params.communityId = selectedCommunity;
      // Only pass type to API if it's a valid ride type (not 'verified')
      if (filterType !== 'all' && filterType !== 'verified') params.type = filterType;
      // Pass userId for "My Rides" to show expired/archived rides
      if (showOnlyMyRides && currentUserId) {
        params.userId = currentUserId;
      }

      const { rides: fetchedRides }: any = await ridesApi.getRides(params);

      let finalRides = fetchedRides || [];
      let isDefault = false;

      // If search query is present but no results, fetch default feed
      if (searchQuery && finalRides.length === 0) {
        const defaultParams = { ...params };
        delete defaultParams.search;
        const { rides: defaultRides }: any = await ridesApi.getRides(defaultParams);
        finalRides = defaultRides || [];
        isDefault = true;
      }

      setShowingDefaultFeed(isDefault);

      // Apply filters on client side for search
      let filteredRides = finalRides;

      // Filter by verification status if "verified" filter is selected
      if (filterType === 'verified') {
        filteredRides = filteredRides.filter((ride: any) => ride.profiles?.nic_verified === true);
      }

      // Apply sorting
      filteredRides.sort((a: any, b: any) => {
        if (sortBy === 'newest') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        } else if (sortBy === 'oldest') {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        } else if (sortBy === 'date') {
          const dateA = new Date(`${a.ride_date} ${a.ride_time}`);
          const dateB = new Date(`${b.ride_date} ${b.ride_time}`);
          return dateA.getTime() - dateB.getTime();
        }
        return 0;
      });

      setAllRides(finalRides);
      setRides(filteredRides);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load rides',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    fetchRides();
  }, [searchQuery, selectedCommunity, sortBy, filterType, currentUserId, showOnlyMyRides]);

  useEffect(() => {
    const handleRideCreatedEvent = (e: CustomEvent) => {
      handleRideCreated(e.detail);
    };
    window.addEventListener('rideCreated', handleRideCreatedEvent as EventListener);
    return () => {
      window.removeEventListener('rideCreated', handleRideCreatedEvent as EventListener);
    };
  }, []);

  const handleDelete = async (rideId: string) => {
    // Optimistic update - remove immediately
    const rideToDelete = rides.find(r => r.id === rideId);
    setRides(prev => prev.filter(r => r.id !== rideId));
    setAllRides(prev => prev.filter(r => r.id !== rideId));

    // Make API call in background
    try {
      await ridesApi.deleteRide(rideId);
      toast({
        title: '🗑️ Ride Deleted',
        description: 'Your ride has been removed successfully',
      });
      // Refresh to sync with server
      fetchRides();
    } catch (error: any) {
      // Rollback on error
      if (rideToDelete) {
        setRides(prev => [...prev, rideToDelete].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
        setAllRides(prev => [...prev, rideToDelete]);
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete ride',
        variant: 'destructive',
      });
    }
  };

  const handleRideCreated = (newRide: any) => {
    // Optimistically add new ride
    setRides(prev => [newRide, ...prev]);
    setAllRides(prev => [newRide, ...prev]);
    // Refresh to get real data from server
    fetchRides();
  };

  const handleRideUpdated = (updatedRide: any) => {
    // Optimistically update ride
    setRides(prev => prev.map(r => r.id === updatedRide.id ? updatedRide : r));
    setAllRides(prev => prev.map(r => r.id === updatedRide.id ? updatedRide : r));
    // Refresh to sync with server
    fetchRides();
  };

  // Helper functions for expiry
  const isRideExpired = (ride: Ride): boolean => {
    if (ride.is_archived) return true;
    const expiresAt = new Date(ride.expires_at);
    return expiresAt < new Date();
  };

  const getTimeUntilExpiry = (ride: Ride): { hours: number; minutes: number } | null => {
    if (isRideExpired(ride)) return null;
    const expiresAt = new Date(ride.expires_at);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes };
  };

  const shouldShowExpiryWarning = (ride: Ride): boolean => {
    if (isRideExpired(ride) || ride.is_archived) return false;
    const timeUntil = getTimeUntilExpiry(ride);
    if (!timeUntil) return false;
    return timeUntil.hours < 2; // Show warning within 2 hours
  };

  const handleExtendRide = async (ride: Ride) => {
    try {
      // Calculate new expiry: 24 hours from now (or from new scheduled time if they edit)
      const newExpiresAt = new Date();
      newExpiresAt.setHours(newExpiresAt.getHours() + 24);
      
      await ridesApi.updateRide(ride.id, {
        expiresAt: newExpiresAt.toISOString(),
        isArchived: false,
      });
      
      toast({
        title: '✅ Ride Reactivated',
        description: 'Your ride has been reactivated and extended by 24 hours',
      });
      fetchRides();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reactivate ride',
        variant: 'destructive',
      });
    }
  };

  const handleArchiveRide = async (ride: Ride) => {
    try {
      await ridesApi.updateRide(ride.id, {
        isArchived: true,
      });
      
      toast({
        title: '📦 Ride Archived',
        description: 'Your ride has been archived',
      });
      fetchRides();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to archive ride',
        variant: 'destructive',
      });
    }
  };

  const handleReviewClick = async (ride: Ride) => {
    try {
      // Check if user has already reviewed this ride
      const { reviews } = await reviewsApi.getReviews({ rideId: ride.id });
      const myReview = reviews.find((r: any) => r.reviewerId._id === currentUserId || r.reviewerId === currentUserId); // Handle populated vs unpopulated
      // Note: getReviews populates reviewerId, so it's an object. But we need to check ID.
      // Actually, the backend populates reviewerId.
      // Let's check `r.reviewer._id` or `r.reviewer.id` if I formatted it.
      // In `route.ts`, I formatted it: `reviewer: { ... }`.
      // Wait, `reviewerId` field in the response from `Review.find().lean()` will be the object if populated.
      // But I also mapped it to `reviewer`.
      // The raw `reviewerId` field might still be there or replaced.
      // Let's look at `route.ts`: `const formattedReviews = reviews.map(...)`.
      // It returns `reviewer` object. The `reviewerId` field might be the populated object.
      // But I need to match with `currentUserId`.
      // The backend `GET` returns `reviews` array.
      // I should probably filter by `reviewerId` in the backend if I want to be sure, or just check here.
      // Since I didn't add `reviewerId` filter to GET, I have to find it here.
      // But wait, `reviewerId` in the DB is a string (ObjectId). When populated, it becomes an object.
      // So `r.reviewerId._id` should be the user ID.
      // However, `currentUserId` is what I have.

      // Let's just open the dialog and let the user create. If it fails with "already reviewed", I should handle that?
      // No, the requirement says "or edit their existing review".
      // So I really should find the review.

      // Let's assume for now I can find it.
      // Actually, `getReviews` returns all reviews for the ride.
      // I can find one where `reviewer.id` (if I added it) matches.
      // In `route.ts`, I didn't add `id` to `reviewer` object. I only added `fullName` and `avatarUrl`.
      // I should probably add `id` to `reviewer` object in `route.ts` to make this easier.
      // OR, I can just use the `reviewerId` field which is populated.

      // Let's update `route.ts` to include `id` in `reviewer` object?
      // Or just rely on `reviewerId` field.

      // For now, I'll just set `reviewingRide(ride)` and `setExistingReview(null)`.
      // I'll implement the "check for existing review" logic inside `ReviewDialog` or here if I can.

      // Better approach:
      // When `ReviewDialog` opens, it can fetch the review itself?
      // No, `ReviewDialog` expects `existingReview` prop.

      // I'll just open it for now.
      setReviewingRide(ride);
      setExistingReview(null); // Reset

      // Try to find existing review
      if (currentUserId) {
        const { reviews } = await reviewsApi.getReviews({ rideId: ride.id });
        const myReview = reviews.find((r: any) =>
          (r.reviewerId && (r.reviewerId._id === currentUserId || r.reviewerId === currentUserId)) ||
          (r.reviewer && (r.reviewer.id === currentUserId || r.reviewer._id === currentUserId))
        );

        if (myReview) {
          setExistingReview({
            id: myReview.id || myReview._id,
            rating: myReview.rating,
            comment: myReview.comment
          });
        } else {
          setExistingReview(null);
        }
      }
      setReviewingRide(ride);
    } catch (error) {
      console.error(error);
      setReviewingRide(ride);
      setExistingReview(null);
    }
  };

  const handleReviewButtonClick = (ride: Ride) => {
    if (!isProfileComplete) {
      setProfileDialogOpen(true);
      return;
    }
    handleReviewClick(ride);
  };

  // Swipe to dismiss handler
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe || isRightSwipe) {
      setShowUnverifiedNote(false);
    }
  };

  const actionsDisabled = !isProfileComplete;
  const actionDisabledTitle = actionsDisabled ? 'Complete your profile to contact or review rides.' : undefined;

  if (loading) {
    return (
      /* Mobile-first: stack on mobile, grid on tablet+ */
      <div className="grid gap-[1rem] sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-[1.25rem] bg-muted/60 rounded w-1/3 mb-[0.5rem] animate-pulse-slow sm:h-[1rem]"></div>
              <div className="h-[1rem] bg-muted/60 rounded w-2/3 animate-pulse-slow sm:h-[0.875rem]"></div>
            </CardHeader>
            <CardContent>
              <div className="h-[5rem] bg-muted/60 rounded animate-pulse-slow"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const hasActiveFilters = searchQuery || selectedCommunity || filterType !== 'all';
  const showNoResultsMessage = hasActiveFilters && rides.length === 0 && allRides.length > 0;
  // Filter to show only current user's rides if showOnlyMyRides is true
  let filteredRides = showNoResultsMessage ? allRides : rides;
  if (showOnlyMyRides && currentUserId) {
    filteredRides = filteredRides.filter(ride => ride.user_id === currentUserId);
  }
  const displayRides = filteredRides;

  // Check if there are unverified rides in the list
  const hasUnverifiedRides = displayRides.some((ride: any) => ride.profiles?.nic_verified !== true);

  // Show "View All Rides" button when community has no rides
  const showViewAllButton = selectedCommunity && rides.length === 0 && allRides.length > 0;

  if (allRides.length === 0) {
    if (showOnlyMyRides) {
      return (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-[3rem] sm:py-[4rem] px-[1rem] sm:px-[1.5rem] flex flex-col items-center justify-center">
              <p className="text-muted-foreground mb-[1rem] sm:mb-[1.25rem] text-[0.875rem] sm:text-[0.95rem] md:text-base leading-relaxed text-center">
                No rides have been created.
              </p>
              <CreateRideDialog>
                <Button>Create Ride</Button>
              </CreateRideDialog>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-[3rem] sm:py-[4rem] px-[1rem] sm:px-[1.5rem] flex flex-col items-center justify-center">
            <p className="text-muted-foreground mb-[1rem] sm:mb-[1.25rem] text-[0.875rem] sm:text-[0.95rem] md:text-base leading-relaxed text-center">
              No rides found. Be the first to post one!
            </p>
            <CreateRideDialog>
              <Button>Create Ride</Button>
            </CreateRideDialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[1rem] sm:gap-[1.25rem]">
      {hasUnverifiedRides && filterType !== 'verified' && showUnverifiedNote && (
        <Card 
          className="border-yellow-500/30 bg-yellow-500/5 relative group touch-pan-y select-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <CardContent className="py-[1rem] pr-[3.5rem] sm:py-[1rem] sm:pr-[3rem]">
            {/* Close button - always top-right */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-[0.5rem] right-[0.25rem] text-yellow-800 dark:text-yellow-200 hover:bg-yellow-500/20 min-h-[2.75rem] min-w-[2.75rem] sm:top-[0.5rem] sm:right-[0.5rem] sm:min-h-[2.5rem] sm:min-w-[2.5rem]"
              onClick={() => setShowUnverifiedNote(false)}
              aria-label="Dismiss note"
            >
              <X className="h-[1.25rem] w-[1.25rem] sm:h-[1rem] sm:w-[1rem]" />
            </Button>
            {/* Vertically centered text with adequate spacing */}
            <div className="flex items-center min-h-[2.75rem]">
              <p className="text-base leading-relaxed text-yellow-800 dark:text-yellow-200 sm:text-sm sm:leading-normal">
                <strong className="font-semibold">Note:</strong> Some rides show a "NIC Not Verified" badge. These rides are from users who haven't verified their NIC yet.
                You can filter to show only verified rides using the dropdown above.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {showingDefaultFeed && (
        <Card className="border-muted-foreground/20 bg-muted/5">
          <CardContent className="py-[1rem] sm:py-[1.25rem] text-center px-[1rem] sm:px-[1.5rem]">
            <p className="text-[0.8125rem] sm:text-[0.875rem] md:text-sm font-medium text-muted-foreground leading-relaxed">
              No ride found matching "{searchQuery}". Showing default feed.
            </p>
          </CardContent>
        </Card>
      )}
      {showNoResultsMessage && (
        <Card className="border-muted-foreground/20">
          <CardContent className="py-[1rem] sm:py-[1.25rem] text-center px-[1rem] sm:px-[1.5rem] space-y-[0.75rem] sm:space-y-[1rem]">
            <p className="text-[0.8125rem] sm:text-[0.875rem] md:text-sm text-muted-foreground leading-relaxed">
              No results found matching your criteria. Showing all rides instead.
            </p>
            {(onClearCommunity || onClearFilters) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (onClearFilters) {
                    onClearFilters();
                  } else if (onClearCommunity) {
                    onClearCommunity();
                  }
                  handleFilterTypeChange('all');
                }}
              >
                View All Rides
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      {showViewAllButton && (onClearCommunity || onClearFilters) && (
        <Card className="border-muted-foreground/20">
          <CardContent className="py-[2rem] sm:py-[3rem] px-[1rem] sm:px-[1.5rem] flex flex-col items-center justify-center">
            <p className="text-[0.875rem] sm:text-[0.95rem] md:text-base text-muted-foreground mb-[1rem] sm:mb-[1.25rem] leading-relaxed text-center">
              No rides found in this community.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (onClearFilters) {
                  onClearFilters();
                } else if (onClearCommunity) {
                  onClearCommunity();
                }
                handleFilterTypeChange('all');
              }}
            >
              View All Rides
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Show empty state if user has no rides when viewing "My Rides" */}
      {showOnlyMyRides && displayRides.length === 0 && allRides.length > 0 && (
        <Card>
          <CardContent className="py-[3rem] sm:py-[4rem] px-[1rem] sm:px-[1.5rem] flex flex-col items-center justify-center">
            <p className="text-muted-foreground mb-[1rem] sm:mb-[1.25rem] text-[0.875rem] sm:text-[0.95rem] md:text-base leading-relaxed text-center">
              No rides have been created.
            </p>
            <CreateRideDialog>
              <Button>Create Ride</Button>
            </CreateRideDialog>
          </CardContent>
        </Card>
      )}

      {/* Mobile-first grid: single column on mobile, responsive grid on larger screens */}
      {displayRides.length > 0 && (
        <div className="grid gap-[1rem] sm:grid-cols-2 lg:grid-cols-3">
          {displayRides.map((ride) => {
          // Skip temporary optimistic rides that might not have all data
          if (ride.id.startsWith('temp-')) {
            return null;
          }
          return (
            <Card key={ride.id} className="hover:shadow-medium transition-shadow flex flex-col h-full">
              <CardHeader>
                <div className="flex items-start justify-between gap-[0.5rem]">
                  <div className="flex-1">
                    {/* Mobile-first: wrap badges vertically on small screens */}
                    <CardTitle className="flex items-center gap-[0.5rem] flex-wrap">
                      <Badge variant={ride.type === 'offering' ? 'default' : 'secondary'}>
                        {ride.type === 'offering' ? 'Offering Ride' : 'Seeking Ride'}
                      </Badge>
                      {ride.profiles && ride.profiles.nic_verified === true ? (
                        <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">
                          ✓ NIC Verified
                        </Badge>
                      ) : ride.profiles && (
                        <Badge variant="outline" className="text-xs">
                          NIC Not Verified
                        </Badge>
                      )}
                      {/* Show Expired tag only in My Rides for expired rides */}
                      {showOnlyMyRides && isRideExpired(ride) && !ride.is_archived && (
                        <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                          Expired
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-[0.5rem] text-[clamp(0.95rem,1.6vw+0.55rem,1.0625rem)] sm:text-base leading-relaxed">
                      <span>Posted by {ride.profiles?.full_name || 'Unknown'}</span>
                    </CardDescription>
                    <p className="text-[clamp(0.875rem,1.4vw+0.5rem,1rem)] text-muted-foreground mt-[0.375rem] leading-relaxed sm:text-sm sm:leading-normal">
                      {formatDistanceToNow(new Date(ride.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {/* Touch-friendly action buttons */}
                  {currentUserId === ride.user_id && (
                    <div className="flex gap-[0.25rem]">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingRide(ride)}
                        className="text-primary hover:text-primary"
                      >
                        <Pencil className="w-[1.25rem] h-[1.25rem] sm:w-[1rem] sm:h-[1rem]" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(ride.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-[1.25rem] h-[1.25rem] sm:w-[1rem] sm:h-[1rem]" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              {/* Mobile-first: adequate spacing for readability */}
              <CardContent className="flex flex-col gap-[0.75rem] flex-1">
                {/* Expiry warning banner */}
                {shouldShowExpiryWarning(ride) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 text-sm text-yellow-800">
                    <p className="font-medium">
                      ⏰ This ride expires in {(() => {
                        const timeUntil = getTimeUntilExpiry(ride);
                        if (!timeUntil) return '';
                        if (timeUntil.hours > 0) {
                          return `${timeUntil.hours} hour${timeUntil.hours > 1 ? 's' : ''} ${timeUntil.minutes} min`;
                        }
                        return `${timeUntil.minutes} min`;
                      })()} – tap to keep it active or repost
                    </p>
                  </div>
                )}
                {/* Expired ride banner with reactivate switch */}
                {isRideExpired(ride) && !ride.is_archived && currentUserId === ride.user_id && showOnlyMyRides && (
                  <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-800">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">⏰ This ride has expired</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">Reactivate</span>
                        <Switch
                          checked={false}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleExtendRide(ride);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                {/* Archived ride banner */}
                {ride.is_archived && currentUserId === ride.user_id && showOnlyMyRides && (
                  <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-800 space-y-2">
                    <p className="font-medium">📦 This ride is archived</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExtendRide(ride)}
                        className="flex-1 text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Reactivate
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-[0.5rem] text-[clamp(0.95rem,1.8vw+0.55rem,1.125rem)] flex-wrap sm:text-base">
                  <MapPin className="w-[1.25rem] h-[1.25rem] text-primary shrink-0 sm:w-[1rem] sm:h-[1rem]" />
                  <span className="font-medium">{ride.start_location}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{ride.end_location}</span>
                </div>
                <div className="flex items-center gap-[0.75rem] text-[clamp(0.9rem,1.5vw+0.5rem,1.05rem)] text-muted-foreground flex-wrap sm:text-sm">
                  <div className="flex items-center gap-[0.375rem]">
                    <Calendar className="w-[1.25rem] h-[1.25rem] shrink-0 sm:w-[1rem] sm:h-[1rem]" />
                    {format(new Date(ride.ride_date), 'MMM dd, yyyy')}
                  </div>
                  <div className="flex items-center gap-[0.375rem]">
                    <Clock className="w-[1.25rem] h-[1.25rem] shrink-0 sm:w-[1rem] sm:h-[1rem]" />
                    {ride.ride_time}
                  </div>
                </div>
                {ride.seats_available && (
                  <div className="flex items-center gap-[0.375rem] text-[clamp(0.9rem,1.4vw+0.5rem,1.05rem)] sm:text-sm">
                    <Users className="w-[1.25rem] h-[1.25rem] text-accent shrink-0 sm:w-[1rem] sm:h-[1rem]" />
                    <span>{ride.seats_available} seats available</span>
                  </div>
                )}
                {ride.description && (
                  <p className="text-[clamp(0.95rem,1.6vw+0.55rem,1.1rem)] text-muted-foreground line-clamp-2 leading-relaxed sm:text-base sm:leading-normal">
                    {ride.description}
                  </p>
                )}
                {ride.recurring_days && ride.recurring_days.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-xs font-medium">Recurring:</span>
                    {ride.recurring_days.map((day) => (
                      <Badge key={day} variant="outline" className="text-xs">
                        {day.slice(0, 3)}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-[0.5rem] w-full">
                {ride.phone && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-[48%] sm:min-w-0"
                      onClick={() => openWhatsApp(ride.phone!, `Hi, I'm interested in your ride from ${ride.start_location} to ${ride.end_location}`)}
                      disabled={actionsDisabled}
                      title={actionDisabledTitle}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-[48%] sm:min-w-0"
                      onClick={() => window.open(`tel:${ride.phone}`, '_self')}
                      disabled={actionsDisabled}
                      title={actionDisabledTitle}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Call
                    </Button>
                  </>
                )}
                {currentUserId !== ride.user_id && ride.type === 'offering' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[48%] sm:min-w-0"
                    onClick={() => handleReviewButtonClick(ride)}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Review
                  </Button>
                )}
              </CardFooter>
              {actionsDisabled && (
                <p className="px-6 pb-2 text-xs text-muted-foreground">
                  Complete your profile to contact or review rides.
                </p>
              )}
              <div className="px-6 pb-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setViewingReviewsRide(ride)}
                >
                  View Reviews
                </Button>
              </div>
            </Card>
          );
        })}
        </div>
      )}

      {editingRide && (
        <CreateRideDialog
          rideToEdit={editingRide}
          open={!!editingRide}
          onOpenChange={(open) => {
            if (!open) {
              setEditingRide(null);
            }
          }}
          onRideUpdated={handleRideUpdated}
        />
      )}

      {reviewingRide && (
        <ReviewDialog
          open={!!reviewingRide}
          onOpenChange={(open) => {
            if (!open) {
              setReviewingRide(null);
              setExistingReview(null);
            }
          }}
          rideId={reviewingRide.id}
          driverId={reviewingRide.user_id}
          existingReview={existingReview}
        />
      )}

      <ProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        completionMessage="Please complete your profile to contact or review rides."
        onProfileUpdate={() => {
          setProfileDialogOpen(false);
          getCurrentUser();
        }}
      />

      {viewingReviewsRide && (
        <Dialog open={!!viewingReviewsRide} onOpenChange={(open) => !open && setViewingReviewsRide(null)}>
          <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Reviews for Ride</DialogTitle>
              <DialogDescription>
                {viewingReviewsRide.start_location} to {viewingReviewsRide.end_location}
              </DialogDescription>
            </DialogHeader>
            <ReviewsList rideId={viewingReviewsRide.id} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default RidesList;
