'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ridesApi, authApi, reviewsApi } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, Phone, Trash2, Users, Pencil, Star, MessageCircle, X, Archive, RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { CreateRideDialog } from './CreateRideDialog';
import ReviewDialog from './ReviewDialog';
import ReviewsList from './ReviewsList';
import ProfileDialog from './ProfileDialog';
import { openWhatsApp } from '@/lib/whatsapp';
import { sortDays } from '@/lib/utils';


interface Ride {
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

interface RidesListProps {
  initialRides?: Ride[];
  initialUser?: { id: string; email: string; emailVerified: boolean } | null;
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
  initialRides = [],
  initialUser = null,
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
  // Initialize with server data if provided
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>(initialRides);
  const [allRides, setAllRides] = useState<Ride[]>(initialRides);
  const [loading, setLoading] = useState(initialRides.length === 0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(initialUser?.id || null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!initialUser);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);
  const [reviewingRide, setReviewingRide] = useState<Ride | null>(null);
  const [viewingReviewsRide, setViewingReviewsRide] = useState<Ride | null>(null);
  const [existingReview, setExistingReview] = useState<any>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [internalSortBy, setInternalSortBy] = useState<string>('newest');
  const [internalFilterType, setInternalFilterType] = useState<string>('all');
  const [showingDefaultFeed, setShowingDefaultFeed] = useState(false);
  const [descriptionRide, setDescriptionRide] = useState<Ride | null>(null);
  const [showUnverifiedNote, setShowUnverifiedNote] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [reactivatingRides, setReactivatingRides] = useState<Set<string>>(new Set());
  const [switchStates, setSwitchStates] = useState<Map<string, boolean>>(new Map());
  const sortBy = externalSortBy !== undefined ? externalSortBy : internalSortBy;
  const filterType = externalFilterType !== undefined ? externalFilterType : internalFilterType;
  const handleSortByChange = onSortByChange || setInternalSortBy;
  const handleFilterTypeChange = onFilterTypeChange || setInternalFilterType;
  const { toast } = useToast();

  const getCurrentUser = async () => {
    try {
      const data: any = await authApi.getCurrentUser();
      const hasUser = !!(data && data.user);
      setIsAuthenticated(hasUser);
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
      setIsAuthenticated(false);
      setCurrentUserId(null);
      setIsProfileComplete(false);
    } finally {
      setUserLoaded(true);
    }
  };

  // Watch for changes in initialUser (when user signs in/out)
  useEffect(() => {
    if (initialUser) {
      setCurrentUserId(initialUser.id);
      setIsAuthenticated(true);
      setUserLoaded(true);
      // Check profile completion
      getCurrentUser();
    } else {
      setCurrentUserId(null);
      setIsAuthenticated(false);
      setUserLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUser]);

  // Track if we should skip initial fetch (when we have server data)
  const [hasInitialData] = useState(initialRides.length > 0 && initialUser !== null);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  // Track previous sortBy to detect sort-only changes
  const [prevSortBy, setPrevSortBy] = useState(sortBy);

  // Helper function to sort rides client-side
  const applySortToRides = (ridesToSort: any[], sortOrder: string) => {
    const sorted = [...ridesToSort];
    sorted.sort((a: any, b: any) => {
      const aDate = new Date(a.updated_at || a.created_at);
      const bDate = new Date(b.updated_at || b.created_at);
      if (sortOrder === 'newest') {
        return bDate.getTime() - aDate.getTime();
      } else if (sortOrder === 'oldest') {
        return aDate.getTime() - bDate.getTime();
      } else if (sortOrder === 'date') {
        const dateA = new Date(`${a.ride_date} ${a.ride_time}`);
        const dateB = new Date(`${b.ride_date} ${b.ride_time}`);
        return dateA.getTime() - dateB.getTime();
      }
      return 0;
    });
    return sorted;
  };

  // Helper function to check if ride should be included based on filters
  const shouldIncludeRide = (ride: any, filters: {
    filterType: string;
    selectedCommunity?: string | null;
    searchQuery?: string;
  }): boolean => {
    // Apply verification filter
    if (filters.filterType === 'verified' && !ride.profiles?.nic_verified) {
      return false;
    }

    // Apply gender preference filter
    if (filters.filterType === 'girls_only' || filters.filterType === 'boys_only' || filters.filterType === 'both') {
      if (ride.gender_preference !== filters.filterType) {
        return false;
      }
    }

    // Apply type filter
    if (filters.filterType === 'offering' || filters.filterType === 'seeking') {
      if (ride.type !== filters.filterType) {
        return false;
      }
    }

    // Apply community filter
    if (filters.selectedCommunity) {
      if (!ride.community_ids || !ride.community_ids.includes(filters.selectedCommunity)) {
        return false;
      }
    }

    // Apply search filter
    if (filters.searchQuery) {
      const lowerQuery = filters.searchQuery.toLowerCase();
      const matchesSearch =
        (ride.start_location || '').toLowerCase().includes(lowerQuery) ||
        (ride.end_location || '').toLowerCase().includes(lowerQuery) ||
        (ride.description || '').toLowerCase().includes(lowerQuery);
      if (!matchesSearch) {
        return false;
      }
    }

    return true;
  };

  const fetchRides = async (skipLoadingState = false) => {
    // Only show loading skeleton if we don't have data or it's not just a sort change
    if (!skipLoadingState) {
      setLoading(true);
    }
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedCommunity) params.communityId = selectedCommunity;
      // Only pass type to API if it's a valid ride type (offering/seeking)
      if (filterType === 'offering' || filterType === 'seeking') {
        params.type = filterType;
      }
      // Pass filterType to API for verification and gender filters
      if (filterType === 'verified') params.filterType = filterType;
      if (filterType === 'girls_only' || filterType === 'boys_only' || filterType === 'both') {
        params.filterType = filterType;
      }
      // Pass sortBy to API
      params.sortBy = sortBy;
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

      // Rides are already filtered and sorted by the API
      // No need to re-apply filters or sorting here
      let filteredRides = finalRides;

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
    // Only fetch rides after user data has been loaded
    if (userLoaded) {
      // Check if we only have sort/filter differences (no search or community filter)
      const hasNonSortFilters = searchQuery || selectedCommunity;

      // If we have initial data and no search/community filters
      if (hasInitialData && !hasNonSortFilters && !hasFetchedOnce) {
        // Apply initial sort/filter to server data immediately (no loading state)
        if (sortBy !== 'newest' || filterType !== 'all') {
          let processedRides = [...initialRides];

          // Apply verification filter if needed
          if (filterType === 'verified') {
            processedRides = processedRides.filter((ride: any) => ride.profiles?.nic_verified === true);
          }

          // Apply sort
          if (sortBy !== 'newest') {
            processedRides = applySortToRides(processedRides, sortBy);
          }

          setRides(processedRides);
          setAllRides(processedRides);
        }

        setHasFetchedOnce(true);
        setPrevSortBy(sortBy);

        // Fetch in background if filters are active to ensure consistency
        if (sortBy !== 'newest' || filterType !== 'all') {
          fetchRides(true);
        }
        return;
      }

      // Check if only sortBy or filterType changed (and we have data, no search/community)
      const onlyClientFilterChanged = (
        hasFetchedOnce &&
        (sortBy !== prevSortBy || filterType !== 'all') &&
        rides.length > 0 &&
        !hasNonSortFilters
      );

      if (onlyClientFilterChanged) {
        // Apply changes immediately to existing data for instant feedback
        let processedRides = [...allRides];

        // Apply verification filter if needed
        if (filterType === 'verified') {
          processedRides = processedRides.filter((ride: any) => ride.profiles?.nic_verified === true);
        }

        // Apply sort
        const sortedRides = applySortToRides(processedRides, sortBy);
        setRides(sortedRides);
        setPrevSortBy(sortBy);

        // Fetch in background to ensure consistency, but don't show loading
        fetchRides(true);
        return;
      }

      // Otherwise, fetch rides normally (with loading state)
      setHasFetchedOnce(true);
      setPrevSortBy(sortBy);
      fetchRides();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCommunity, sortBy, filterType, currentUserId, showOnlyMyRides, userLoaded]);

  useEffect(() => {
    const handleRideCreatedEvent = (e: CustomEvent) => {
      handleRideCreated(e.detail);
    };
    window.addEventListener('rideCreated', handleRideCreatedEvent as EventListener);
    return () => {
      window.removeEventListener('rideCreated', handleRideCreatedEvent as EventListener);
    };
  }, []);

  // Store current filter values in refs to avoid stale closures in SSE handler
  const filterRefs = useRef({ filterType, sortBy, selectedCommunity, searchQuery });

  // Update refs when filters change
  useEffect(() => {
    filterRefs.current = { filterType, sortBy, selectedCommunity, searchQuery };
  }, [filterType, sortBy, selectedCommunity, searchQuery]);

  // Real-time updates via Server-Sent Events (SSE)
  useEffect(() => {
    // Only connect to SSE for "All Rides" tab, not "My Rides"
    if (showOnlyMyRides) {
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 3000; // 3 seconds

    const connect = () => {
      try {
        // Close existing connection if any
        if (eventSource) {
          eventSource.close();
        }

        eventSource = new EventSource('/api/rides/stream');

        eventSource.onopen = () => {
          reconnectAttempts = 0; // Reset on successful connection
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Handle connection confirmation
            if (data.type === 'connected') {
              return;
            }

            // Handle errors
            if (data.type === 'error') {
              console.error('SSE error:', data.message);
              return;
            }

            // Handle ride changes
            if (data.operation) {
              const { operation } = data;

              // Handle delete operations
              if (operation === 'delete' && data.rideId) {
                const rideId = data.rideId;
                // Remove from all rides
                setAllRides((prev) => prev.filter((r) => r.id !== rideId));
                // Remove from filtered rides
                setRides((prev) => prev.filter((r) => r.id !== rideId));
                return;
              }

              // Handle insert and update operations (require ride data)
              if (data.ride) {
                const { ride } = data;

                if (operation === 'insert') {
                  // Add new ride to the top of the list
                  setAllRides((prev) => {
                    // Check if ride already exists (avoid duplicates)
                    const exists = prev.some((r) => r.id === ride.id);
                    if (exists) return prev;

                    // Filter out expired/archived rides if needed (for consistency)
                    const now = new Date();
                    const isExpired = ride.expires_at && new Date(ride.expires_at) <= now;
                    if (ride.is_archived || isExpired) {
                      // Still add it, but client can filter if needed
                    }

                    // Add to top
                    return [ride, ...prev];
                  });

                  // Update filtered rides list
                  setRides((prev) => {
                    const exists = prev.some((r) => r.id === ride.id);
                    if (exists) return prev;

                    // Apply current filters using helper function
                    const currentFilters = filterRefs.current;
                    if (!shouldIncludeRide(ride, currentFilters)) {
                      return prev;
                    }

                    // Add to top and apply sort
                    const newRides = [ride, ...prev];
                    return applySortToRides(newRides, currentFilters.sortBy);
                  });
                } else if (operation === 'update') {
                  // Replace existing ride
                  setAllRides((prev) => {
                    const index = prev.findIndex((r) => r.id === ride.id);
                    if (index === -1) {
                      // Ride not in list, add it to top
                      return [ride, ...prev];
                    }
                    // Replace existing ride
                    const updated = [...prev];
                    updated[index] = ride;
                    return updated;
                  });

                  // Update filtered rides list
                  setRides((prev) => {
                    const index = prev.findIndex((r) => r.id === ride.id);

                    // Check if ride should be included with current filters using helper function
                    const currentFilters = filterRefs.current;
                    const shouldInclude = shouldIncludeRide(ride, currentFilters);

                    if (index === -1) {
                      // Ride not in filtered list
                      if (shouldInclude) {
                        // Add it if it should be included
                        const newRides = [ride, ...prev];
                        return applySortToRides(newRides, currentFilters.sortBy);
                      }
                      return prev;
                    }

                    if (!shouldInclude) {
                      // Remove from filtered list if it no longer matches filters
                      return prev.filter((r) => r.id !== ride.id);
                    }

                    // Update existing ride
                    const updated = [...prev];
                    updated[index] = ride;
                    return applySortToRides(updated, currentFilters.sortBy);
                  });
                } else if (operation === 'expire') {
                  // Handle ride expiration - update ride to mark it as expired
                  setAllRides((prev) => {
                    const index = prev.findIndex((r) => r.id === ride.id);
                    if (index === -1) {
                      // Ride not in list, add it
                      return [ride, ...prev];
                    }
                    // Replace existing ride with updated expiration info
                    const updated = [...prev];
                    updated[index] = ride;
                    return updated;
                  });

                  // Update filtered rides list - remove from All Rides since it's now expired
                  setRides((prev) => {
                    const index = prev.findIndex((r) => r.id === ride.id);
                    if (index === -1) {
                      return prev; // Ride not in filtered list
                    }
                    // Remove expired ride from All Rides view (it's no longer bookable)
                    // Users viewing My Rides will still see it with the reactivate option
                    return prev.filter((r) => r.id !== ride.id);
                  });
                }
              }
            }
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);

          // Close the connection
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }

          // Attempt to reconnect
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            reconnectTimeout = setTimeout(() => {
              connect();
            }, reconnectDelay);
          } else {
            console.error('Max reconnection attempts reached. SSE connection closed.');
          }
        };
      } catch (error) {
        console.error('Error setting up SSE connection:', error);
      }
    };

    // Connect when component mounts or when dependencies change
    connect();

    // Cleanup on unmount or when showOnlyMyRides changes
    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
    // Only reconnect when showOnlyMyRides changes (switching between All Rides and My Rides)
    // Filters are applied client-side, so no need to reconnect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOnlyMyRides]);

  // Timer to refresh countdown badges every minute
  useEffect(() => {
    const timer = setInterval(() => {
      // Force re-render by updating a dummy state
      setRides(prev => [...prev]);
    }, 60000); // Update every 60 seconds

    return () => clearInterval(timer);
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
          new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
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
    // Refresh to sync with server without flashing the loading skeleton
    fetchRides(true);
  };

  // Helper functions for expiry
  const isRideExpired = (ride: Ride): boolean => {
    if (ride.is_archived) return true;
    // Respect user setting to disable auto-expiry
    if (ride.profiles?.disable_auto_expiry) return false;
    const expiresAt = new Date(ride.expires_at);
    return expiresAt < new Date();
  };

  // Calculate time remaining for a ride (in minutes)
  const getTimeRemaining = (ride: Ride): { minutes: number; seconds: number; expired: boolean } => {
    const expiresAt = new Date(ride.expires_at);
    const now = new Date();
    const diff = expiresAt.getTime() - now.getTime();

    if (diff <= 0) {
      return { minutes: 0, seconds: 0, expired: true };
    }

    const totalMinutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { minutes: totalMinutes, seconds, expired: false };
  };

  const handleExtendRide = async (ride: Ride) => {
    try {
      setReactivatingRides(prev => new Set([...prev, ride.id]));
      setSwitchStates(prev => new Map(prev).set(ride.id, true)); // Show green

      // Calculate new expiry: 24 hours from now (or from new scheduled time if they edit)
      const newExpiresAt = new Date();
      newExpiresAt.setHours(newExpiresAt.getHours() + 24);

      // Get current date in YYYY-MM-DD format
      const currentDate = new Date().toISOString().split('T')[0];

      await ridesApi.updateRide(ride.id, {
        rideDate: currentDate, // Update ride date to current date when renewing
        expiresAt: newExpiresAt.toISOString(),
        isArchived: false,
      });

      toast({
        title: '✅ Ride Reactivated',
        description: 'Your ride has been reactivated and extended by 24 hours',
      });

      // Reset switch after a brief delay to show the success color
      setTimeout(() => {
        setSwitchStates(prev => {
          const next = new Map(prev);
          next.delete(ride.id);
          return next;
        });
      }, 1000);

      // Skip loading skeleton to avoid UI flash
      fetchRides(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reactivate ride',
        variant: 'destructive',
      });
      // Reset switch state on error
      setSwitchStates(prev => {
        const next = new Map(prev);
        next.delete(ride.id);
        return next;
      });
    } finally {
      setReactivatingRides(prev => {
        const next = new Set(prev);
        next.delete(ride.id);
        return next;
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
    // Check authentication first
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    // Then check profile completion
    if (!isProfileComplete) {
      setProfileDialogOpen(true);
      return;
    }
    handleReviewClick(ride);
  };

  const ensureProfileComplete = (action: () => void) => {
    // Check authentication first
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    // Then check profile completion
    if (!isProfileComplete) {
      setProfileDialogOpen(true);
      return;
    }
    action();
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

  const actionsDisabled = !isAuthenticated || !isProfileComplete;
  const getActionsDisabledMessage = () => {
    if (!isAuthenticated) {
      return 'Sign in to contact, review, or view reviews.';
    }
    if (!isProfileComplete) {
      return 'Complete your profile to contact or review rides.';
    }
    return '';
  };

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
              <CreateRideDialog preselectedCommunityId={selectedCommunity || undefined}>
                <Button className="hidden md:inline-flex">Create Ride</Button>
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
            <CreateRideDialog preselectedCommunityId={selectedCommunity || undefined}>
              <Button>Create Ride</Button>
            </CreateRideDialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
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
              <CreateRideDialog preselectedCommunityId={selectedCommunity || undefined}>
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
                        <CardTitle className="flex items-center gap-[0.5rem] flex-wrap tracking-normal">
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
                          {ride.profiles?.disable_auto_expiry && (
                            <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">
                              Always Active
                            </Badge>
                          )}
                          {/* Gender Preference Badge */}
                          {ride.gender_preference && (
                            <Badge variant="outline" className="text-xs bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700">
                              {ride.gender_preference === 'girls_only' ? '👧 Girls Only' : ride.gender_preference === 'boys_only' ? '👦 Boys Only' : '👥 Both'}
                            </Badge>
                          )}
                          {/* Show Expired tag only in My Rides for expired rides */}
                          {showOnlyMyRides && isRideExpired(ride) && !ride.is_archived && (
                            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                              Expired
                            </Badge>
                          )}
                          {/* Expiration countdown badge */}
                          {!showOnlyMyRides && !isRideExpired(ride) && !ride.profiles?.disable_auto_expiry && getTimeRemaining(ride).minutes <= 30 && (
                            <Badge variant="outline" className={`text-xs ${getTimeRemaining(ride).minutes <= 5 ? 'bg-red-100 text-red-800 border-red-300' : 'bg-yellow-100 text-yellow-800 border-yellow-300'}`}>
                              ⏱️ Expires in {getTimeRemaining(ride).minutes}m
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-[0.5rem] text-[clamp(0.95rem,1.6vw+0.55rem,1.0625rem)] sm:text-base leading-relaxed">
                          <span>Posted by {ride.profiles?.full_name || 'Unknown'}</span>
                        </CardDescription>
                        <p className="text-[clamp(0.875rem,1.4vw+0.5rem,1rem)] text-muted-foreground mt-[0.375rem] leading-relaxed sm:text-sm sm:leading-normal">
                          {formatDistanceToNow(new Date(ride.updated_at || ride.created_at), { addSuffix: true })}
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
                    {/* Expired ride banner with reactivate switch */}
                    {isRideExpired(ride) && !ride.is_archived && currentUserId === ride.user_id && showOnlyMyRides && (
                      <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-800">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">⏰ This ride has expired</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs">Reactivate</span>
                            <div className={switchStates.get(ride.id) ? 'bg-green-100 rounded-full p-1' : ''}>
                              <Switch
                                checked={switchStates.get(ride.id) || false}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    handleExtendRide(ride);
                                  }
                                }}
                                disabled={reactivatingRides.has(ride.id)}
                                className={switchStates.get(ride.id) ? '[&_span]:bg-green-500' : ''}
                              />
                            </div>
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
                    </div>
                    {ride.seats_available && (
                      <div className="flex items-center gap-[0.375rem] text-[clamp(0.9rem,1.4vw+0.5rem,1.05rem)] sm:text-sm">
                        <Users className="w-[1.25rem] h-[1.25rem] text-accent shrink-0 sm:w-[1rem] sm:h-[1rem]" />
                        <span>{ride.seats_available} seats available</span>
                      </div>
                    )}
                    {ride.description && (
                      (() => {
                        const preview = ride.description.length > 80
                          ? `${ride.description.slice(0, 80)}…`
                          : ride.description;
                        return (
                          <div className="flex flex-col gap-1">
                            <p className="text-[clamp(0.95rem,1.4vw+0.55rem,1rem)] text-muted-foreground leading-relaxed sm:text-sm sm:leading-normal line-clamp-1">
                              {preview}
                            </p>
                            <Button
                              variant="link"
                              size="sm"
                              className="px-0 w-fit -mt-1 text-sm"
                              onClick={() => setDescriptionRide(ride)}
                            >
                              See more
                            </Button>
                          </div>
                        );
                      })()
                    )}
                    {ride.recurring_days && ride.recurring_days.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-xs font-medium">Recurring:</span>
                        {sortDays(ride.recurring_days).map((day) => (
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
                          onClick={() =>
                            ensureProfileComplete(() =>
                              openWhatsApp(
                                ride.phone!,
                                `Hi, I'm interested in your ride from ${ride.start_location} to ${ride.end_location}`
                              )
                            )
                          }
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          WhatsApp
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 min-w-[48%] sm:min-w-0"
                          onClick={() =>
                            ensureProfileComplete(() => window.open(`tel:${ride.phone}`, '_self'))
                          }
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Call
                        </Button>
                      </>
                    )}
                    {currentUserId !== ride.user_id && (
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
                    <p className="px-6 pb-2 text-xs font-semibold text-amber-500">
                      {getActionsDisabledMessage()}
                    </p>
                  )}
                  <div className="px-6 pb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        if (!isAuthenticated) {
                          setShowAuthModal(true);
                          return;
                        }
                        setViewingReviewsRide(ride);
                      }}
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

      {/* Full description modal */}
      <Dialog open={!!descriptionRide} onOpenChange={(open) => !open && setDescriptionRide(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ride Description</DialogTitle>

          </DialogHeader>
          <div className=" whitespace-pre-wrap text-sm sm:text-base">
            {descriptionRide?.description}
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth Modal - shown when unauthenticated user tries to interact with rides */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="animate-scale-in">
          <DialogHeader>
            <DialogTitle>Sign In Required</DialogTitle>
            <DialogDescription>
              You need to sign in to contact, review, or view reviews for rides. Create an account or sign in to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <Button
              onClick={() => {
                router.push('/auth');
                setShowAuthModal(false);
              }}
              className="w-full"
            >
              Sign In / Sign Up
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAuthModal(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RidesList;
