'use client';

import { useState, useEffect } from 'react';
import { communitiesApi } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SearchBarProps {
  initialCommunities?: Community[];
  onSearch: (query: string) => void;
  onCommunitySelect: (communityId: string | null, communityName?: string | null) => void;
}

interface Community {
  id: string;
  name: string;
}

const SearchBar = ({ initialCommunities = [], onSearch, onCommunitySelect }: SearchBarProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<string>('all');
  const [communities, setCommunities] = useState<Community[]>(initialCommunities);

  useEffect(() => {
    if (initialCommunities.length === 0) {
      fetchCommunities();
    }
  }, []);

  const fetchCommunities = async () => {
    try {
      const { communities: fetchedCommunities } = await communitiesApi.getCommunities();
      const sorted = (fetchedCommunities || []).sort((a: Community, b: Community) =>
        a.name.localeCompare(b.name)
      );
      setCommunities(sorted);
    } catch (error) {

    }
  };

  const applyFilters = () => {
    const communityId = selectedCommunity === 'all' ? null : selectedCommunity;
    const communityName = communities.find(c => c.id === communityId)?.name || null;

    onSearch(searchQuery.trim());
    onCommunitySelect(communityId, communityName);
  };

  const handleClear = () => {
    setSearchQuery('');
    onSearch('');
    // Re-apply community filter without search query
    const communityId = selectedCommunity === 'all' ? null : selectedCommunity;
    const communityName = communities.find(c => c.id === communityId)?.name || null;
    onCommunitySelect(communityId, communityName);
  };

  const handleCommunityChange = (value: string) => {
    setSelectedCommunity(value);
    applyFilters();
  };

  const hasText = searchQuery.trim().length > 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:gap-8">
          {/* Search Input */}
          <div className="flex flex-col gap-2 flex-1 min-w-0 text-sm pt-3">
            <Label htmlFor="search">Search Rides</Label>
            <div className="relative">
              <Input
                id="search"
                placeholder="Search by location, keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                className="h-12 pr-12 pl-4" // Right padding for icon
              />

              {/* Right-side Icon Container */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {/* MOBILE: Always show Search icon (no clear button) */}
                <div className="block lg:hidden">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>

                {/* DESKTOP: Show Search when empty, X when typing */}
                <div className="hidden lg:block">
                  {hasText ? (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ) : (
                    <Search className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Community Filter */}
          <div className="flex flex-col gap-3 min-w-0 md:max-w-64">
            <Label htmlFor="community">Filter by Community</Label>
            <Select value={selectedCommunity} onValueChange={handleCommunityChange}>
              <SelectTrigger id="community" className="h-12">
                <SelectValue placeholder="All communities" />
              </SelectTrigger>
              <SelectContent
                className='max-h-[200px] overflow-y-auto'
                side="bottom"
                align="start"
                sideOffset={5}
                avoidCollisions={false}>
                <SelectItem value="all">All communities</SelectItem>
                {communities.map((community) => (
                  <SelectItem key={community.id} value={community.id}>
                    {community.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchBar;