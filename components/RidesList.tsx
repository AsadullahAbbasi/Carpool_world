'use client';

import { useEffect, useState } from 'react';
import { ridesApi, authApi, reviewsApi } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, MapPin, Phone, Trash2, Users, Pencil, Star, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { CreateRideDialog } from './CreateRideDialog';
import ReviewDialog from './ReviewDialog';
import ReviewsList from './ReviewsList';
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
  const [editingRide, setEditingRide] = useState<Ride | null>(null);
  const [reviewingRide, setReviewingRide] = useState<Ride | null>(null);
  const [viewingReviewsRide, setViewingReviewsRide] = useState<Ride | null>(null);
  const [existingReview, setExistingReview] = useState<any>(null);
  const [internalSortBy, setInternalSortBy] = useState<string>('newest');
  const [internalFilterType, setInternalFilterType] = useState<string>('all');
  const [showingDefaultFeed, setShowingDefaultFeed] = useState(false);
  const sortBy = externalSortBy !== undefined ? externalSortBy : internalSortBy;
  const filterType = externalFilterType !== undefined ? externalFilterType : internalFilterType;
  const handleSortByChange = onSortByChange || setInternalSortBy;
  const handleFilterTypeChange = onFilterTypeChange || setInternalFilterType;
  const { toast } = useToast();

  const getCurrentUser = async () => {
    try {
      const data: any = await authApi.getCurrentUser();
      setCurrentUserId(data.user?.id || null);
    } catch (error) {
      setCurrentUserId(null);
    }
  };

  const fetchRides = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedCommunity) params.communityId = selectedCommunity;
      if (filterType !== 'all') params.type = filterType;

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
    fetchRides();
    getCurrentUser();
  }, [searchQuery, selectedCommunity, sortBy, filterType]);

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

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-4 bg-muted/60 rounded w-1/3 mb-2 animate-pulse-slow"></div>
              <div className="h-3 bg-muted/60 rounded w-2/3 animate-pulse-slow"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-muted/60 rounded animate-pulse-slow"></div>
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
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
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
    <div className="space-y-6">
      {hasUnverifiedRides && filterType !== 'verified' && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="py-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> Some rides show a "NIC Not Verified" badge. These rides are from users who haven't verified their NIC yet.
              You can filter to show only verified rides using the dropdown above.
            </p>
          </CardContent>
        </Card>
      )}
      {showingDefaultFeed && (
        <Card className="border-muted-foreground/20 bg-muted/5">
          <CardContent className="py-4 text-center space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              No ride found matching "{searchQuery}". Showing default feed.
            </p>
          </CardContent>
        </Card>
      )}
      {showNoResultsMessage && (
        <Card className="border-muted-foreground/20">
          <CardContent className="py-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
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
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayRides.map((ride) => {
          // Skip temporary optimistic rides that might not have all data
          if (ride.id.startsWith('temp-')) {
            return null;
          }
          return (
            <Card key={ride.id} className="hover:shadow-medium transition-shadow flex flex-col h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 flex-wrap">
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
                    </CardTitle>
                    <CardDescription className="mt-2">
                      <span>Posted by {ride.profiles?.full_name || 'Unknown'}</span>
                    </CardDescription>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(ride.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {currentUserId === ride.user_id && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingRide(ride)}
                        className="text-primary hover:text-primary"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(ride.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 flex-1">
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
                {ride.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {ride.description}
                  </p>
                )}
                {ride.recurring_days && ride.recurring_days.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs font-medium">Recurring:</span>
                    {ride.recurring_days.map((day) => (
                      <Badge key={day} variant="outline" className="text-xs">
                        {day.slice(0, 3)}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex gap-2 flex-wrap">
                {ride.phone && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openWhatsApp(ride.phone!, `Hi, I'm interested in your ride from ${ride.start_location} to ${ride.end_location}`)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(`tel:${ride.phone}`, '_self')}
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
                    className="flex-1"
                    onClick={() => handleReviewClick(ride)}
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Review
                  </Button>
                )}
              </CardFooter>
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
