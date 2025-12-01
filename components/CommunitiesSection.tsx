'use client';

import { useEffect, useState } from 'react';
import { communitiesApi, authApi } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectSeparator,
  SelectGroup,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Users, UserPlus, UserMinus, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import RidesList from './RidesList';
import ProfileDialog from './ProfileDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Community {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at?: string;
  _count?: number;
}

interface CommunitiesSectionProps {
  selectedCommunity?: string | null;
  selectedCommunityName?: string | null;
  onSelectCommunity: (communityId: string | null, communityName?: string | null) => void;
  onBackToCommunities?: () => void;
}

const CommunitiesSection = ({ selectedCommunity, selectedCommunityName, onSelectCommunity, onBackToCommunities }: CommunitiesSectionProps) => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [userCommunities, setUserCommunities] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [sortBy, setSortBy] = useState<string>('newest');
  const [filterBy, setFilterBy] = useState<string>('all');
  const [communityFilterType, setCommunityFilterType] = useState<string>('all');
  const [communitySortBy, setCommunitySortBy] = useState<string>('newest');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileCompletionMessage, setProfileCompletionMessage] = useState('');
  const { toast } = useToast();

  const checkProfile = async () => {
    try {
      const userData: any = await authApi.getCurrentUser();
      const profile = userData.profile;

      if (profile) {
        const missingFields: string[] = [];
        if (!profile.fullName) missingFields.push('Full Name');
        if (!profile.phone) missingFields.push('Phone Number');
        if (!profile.gender) missingFields.push('Gender');
        if (profile.gender !== 'female' && !profile.avatarUrl) missingFields.push('Profile Picture');

        if (missingFields.length > 0) {
          const message = `To ensure trust and safety in our community, please complete your profile before creating a community. Missing: ${missingFields.join(', ')}.`;
          setProfileCompletionMessage(message);
          setShowProfileDialog(true);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking profile:', error);
      return false;
    }
  };

  const handleCreateClick = async () => {
    const isProfileComplete = await checkProfile();
    if (isProfileComplete) {
      setDialogOpen(true);
    }
  };

  const getCurrentUserId = async () => {
    try {
      const data: any = await authApi.getCurrentUser();
      return data.user?.id || null;
    } catch {
      return null;
    }
  };

  const fetchCommunities = async () => {
    try {
      const response = await communitiesApi.getCommunities();
      const fetchedCommunities = response.communities || [];
      // Transform to match expected format
      const transformed = (fetchedCommunities || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        created_by: c.created_by,
        created_at: c.created_at,
        updated_at: c.updated_at,
      }));
      setCommunities(transformed);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load communities',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCommunities = async () => {
    try {
      const response = await communitiesApi.getUserCommunities();
      const userCommIds = response.communities || [];
      setUserCommunities(new Set(userCommIds || []));
    } catch (error: any) {
      console.error('Error fetching user communities:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchCommunities(), fetchUserCommunities()]);
      const userId = await getCurrentUserId();
      setCurrentUserId(userId);
    };
    init();
  }, []);

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Community name is required',
        variant: 'destructive',
      });
      return;
    }

    // Close dialog immediately (optimistic)
    const wasEditing = !!editingCommunity;
    const communityName = formData.name;
    const communityDescription = formData.description;
    const editingCommunityId = editingCommunity?.id;
    const editingCommunityData = editingCommunity ? { ...editingCommunity } : null;

    setDialogOpen(false);
    setEditingCommunity(null);
    setFormData({ name: '', description: '' });

    try {
      if (wasEditing && editingCommunityId && editingCommunityData) {
        // Optimistic update for edit
        const updatedCommunity = {
          ...editingCommunityData,
          name: communityName,
          description: communityDescription || null,
        };
        setCommunities(prev => prev.map(c => c.id === editingCommunityId ? updatedCommunity : c));

        // Make API call in background
        communitiesApi.updateCommunity(editingCommunityId, {
          name: communityName,
          description: communityDescription || undefined,
        }).then(() => {
          toast({
            title: '✅ Community Updated!',
            description: `${communityName} has been updated successfully.`,
          });
          fetchCommunities();
          fetchUserCommunities();
        }).catch((error: any) => {
          // Rollback on error
          if (editingCommunityData) {
            setCommunities(prev => prev.map(c => c.id === editingCommunityId ? editingCommunityData : c));
          }
          toast({
            title: 'Error',
            description: error.message || 'Failed to update community',
            variant: 'destructive',
          });
          setDialogOpen(true);
          if (editingCommunityData) {
            setEditingCommunity(editingCommunityData);
            setFormData({ name: communityName, description: communityDescription });
          }
        });
      } else {
        // Optimistic create
        const tempId = `temp-${Date.now()}`;
        const newCommunity: Community = {
          id: tempId,
          name: communityName,
          description: communityDescription || null,
          created_by: currentUserId || '',
          created_at: new Date().toISOString(),
        };
        setCommunities(prev => [newCommunity, ...prev]);

        // Make API call in background
        communitiesApi.createCommunity({
          name: communityName,
          description: communityDescription || undefined,
        }).then((response) => {
          toast({
            title: '🎉 Community Created!',
            description: `Welcome to ${communityName}. You've been auto-joined as admin.`,
          });
          // Replace optimistic community with real one
          if (response.community) {
            setCommunities(prev => prev.map(c => c.id === tempId ? response.community : c));
          }
          fetchCommunities();
          fetchUserCommunities();
        }).catch((error: any) => {
          // Rollback on error
          setCommunities(prev => prev.filter(c => c.id !== tempId));
          toast({
            title: 'Error',
            description: error.message || 'Failed to create community',
            variant: 'destructive',
          });
          setDialogOpen(true);
          setFormData({ name: communityName, description: communityDescription });
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save community',
        variant: 'destructive',
      });
      setDialogOpen(true);
      if (wasEditing && editingCommunityData) {
        setEditingCommunity(editingCommunityData);
        setFormData({ name: communityName, description: communityDescription });
      }
    }
  };

  const handleDeleteCommunity = async (communityId: string, communityName: string) => {
    // Optimistic update - remove immediately
    const communityToDelete = communities.find(c => c.id === communityId);
    setCommunities(prev => prev.filter(c => c.id !== communityId));

    // Make API call in background
    try {
      await communitiesApi.deleteCommunity(communityId);
      toast({
        title: '🗑️ Community Deleted',
        description: `${communityName} has been deleted successfully.`,
      });
      fetchCommunities();
      fetchUserCommunities();
    } catch (error: any) {
      // Rollback on error
      if (communityToDelete) {
        setCommunities(prev => [...prev, communityToDelete]);
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete community',
        variant: 'destructive',
      });
    }
  };

  const handleEditCommunity = (community: Community) => {
    setEditingCommunity(community);
    setFormData({
      name: community.name,
      description: community.description || '',
    });
    setDialogOpen(true);
  };

  const handleJoinLeave = async (communityId: string, isJoined: boolean, isCreator: boolean) => {
    try {
      if (isJoined) {
        if (isCreator) {
          toast({
            title: 'Cannot Leave',
            description: 'Community creators cannot leave their own communities',
            variant: 'destructive',
          });
          return;
        }
        await communitiesApi.leaveCommunity(communityId);
        const communityName = communities.find((c) => c.id === communityId)?.name;
        toast({
          title: '👋 Left Community',
          description: `You've left "${communityName}"`,
        });
      } else {
        await communitiesApi.joinCommunity(communityId);
        const communityName = communities.find((c) => c.id === communityId)?.name;
        toast({
          title: '✅ Joined Community!',
          description: `Welcome to "${communityName}". Start posting rides now!`,
        });
      }

      await fetchUserCommunities();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update membership',
        variant: 'destructive',
      });
    }
  };

  const getFilteredAndSortedCommunities = () => {
    let sorted = [...communities];

    sorted.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'newest') {
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      return 0;
    });

    if (filterBy === 'joined') {
      return sorted.filter((c) => userCommunities.has(c.id));
    } else if (filterBy === 'available') {
      return sorted.filter((c) => !userCommunities.has(c.id));
    }

    return sorted;
  };

  if (loading) {
    return <div className="text-center py-8">Loading communities...</div>;
  }

  const allCommunitiesSorted = [...communities].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'newest') {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    } else if (sortBy === 'oldest') {
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    }
    return 0;
  });

  const filteredCommunities = getFilteredAndSortedCommunities();
  const hasActiveFilter = filterBy !== 'all';
  const showNoResultsMessage = hasActiveFilter && filteredCommunities.length === 0 && communities.length > 0;
  const displayCommunities = showNoResultsMessage ? allCommunitiesSorted : filteredCommunities;

  // If a community is selected, show its rides
  if (selectedCommunity) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => {
                if (onBackToCommunities) {
                  onBackToCommunities();
                }
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Communities
            </Button>
            <h2 className="text-2xl font-semibold">
              Rides in {selectedCommunityName || 'Community'}
            </h2>
          </div>
          <div className="w-full sm:w-auto">
            <Select
              value={`${communitySortBy}-${communityFilterType}`}
              onValueChange={(value) => {
                const [newSortBy, newFilterType] = value.split('-');
                setCommunitySortBy(newSortBy);
                setCommunityFilterType(newFilterType);
              }}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Filter & Sort" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                side="bottom"
                sideOffset={4}
                className="max-h-[300px] overflow-y-auto w-[var(--radix-select-trigger-width)]"
              >
                <SelectGroup>
                  <SelectLabel>All Rides</SelectLabel>
                  <SelectItem value="newest-all">Newest First - All</SelectItem>
                  <SelectItem value="oldest-all">Oldest First - All</SelectItem>
                  <SelectItem value="date-all">Ride Date - All</SelectItem>
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
        <RidesList
          selectedCommunity={selectedCommunity}
          selectedCommunityName={selectedCommunityName}
          filterType={communityFilterType}
          onFilterTypeChange={setCommunityFilterType}
          sortBy={communitySortBy}
          onSortByChange={setCommunitySortBy}
          showFilter={false}
          onClearCommunity={() => {
            if (onBackToCommunities) {
              onBackToCommunities();
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-4 flex-wrap mb-4">
        <div className="flex-1 min-w-[200px]">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <Select value={filterBy} onValueChange={setFilterBy}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Communities</SelectItem>
              <SelectItem value="joined">My Communities</SelectItem>
              <SelectItem value="available">Available to Join</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-semibold">Communities</h2>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingCommunity(null);
              setFormData({ name: '', description: '' });
            }
          }}
        >
          <Button
            onClick={handleCreateClick}
            className="bg-gradient-to-r from-accent to-accent/90 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Community
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCommunity ? 'Edit Community' : 'Create a Community'}</DialogTitle>
              <DialogDescription>
                {editingCommunity
                  ? 'Update your community details'
                  : 'Start a new community for your neighborhood or interest group'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCommunity} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Community Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Downtown Commuters"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="What is this community about?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full">
                  {editingCommunity ? 'Update Community' : 'Create Community'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {showNoResultsMessage && (
        <Card className="border-muted-foreground/20">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
              No results found matching your criteria. Showing all communities instead.
            </p>
          </CardContent>
        </Card>
      )}

      {communities.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No communities yet. Create the first one!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayCommunities.map((community) => {
            const isJoined = userCommunities.has(community.id);
            return (
              <Card key={community.id} className="hover:shadow-medium transition-shadow flex flex-col h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      {community.name}
                    </CardTitle>
                    {community.created_by === currentUserId && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditCommunity(community)}
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Community?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{community.name}" and all associated rides. This action
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCommunity(community.id, community.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                  {community.description && <CardDescription>{community.description}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-3 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isJoined && <Badge variant="secondary">Member</Badge>}
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      const isCreator = community.created_by === currentUserId;
                      handleJoinLeave(community.id, isJoined, isCreator);
                    }}
                    disabled={isJoined && community.created_by === currentUserId}
                  >
                    {isJoined ? (
                      <>
                        <UserMinus className="w-4 h-4 mr-2" />
                        {community.created_by === currentUserId ? 'Admin' : 'Leave'}
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Join
                      </>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => onSelectCommunity(community.id, community.name)}
                  >
                    View Rides
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <ProfileDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        completionMessage={profileCompletionMessage}
        onProfileUpdate={() => {
          setShowProfileDialog(false);
          toast({
            title: 'Profile Updated',
            description: 'You can now create a community.',
          });
        }}
      />
    </div>
  );
};

export default CommunitiesSection;
