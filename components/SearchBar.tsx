'use client';

import { useState, useEffect } from 'react';
import { communitiesApi } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
  onSearch: (query: string) => void;
  onCommunitySelect: (communityId: string | null, communityName?: string | null) => void;
}

interface Community {
  id: string;
  name: string;
}

const SearchBar = ({ onSearch, onCommunitySelect }: SearchBarProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<string>('');
  const [communities, setCommunities] = useState<Community[]>([]);

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      const { communities: fetchedCommunities } = await communitiesApi.getCommunities();
      const sorted = (fetchedCommunities || []).sort((a: Community, b: Community) =>
        a.name.localeCompare(b.name)
      );
      setCommunities(sorted);
    } catch (error) {
      console.error('Error fetching communities:', error);
    }
  };

  const normalizeCommunity = (value: string) => {
    if (!value || value === 'all') return '';
    return value;
  };

  const applyFilters = (queryOverride?: string) => {
    const normalizedCommunity = normalizeCommunity(selectedCommunity);
    const selectedComm = communities.find(c => c.id === normalizedCommunity);
    const queryToUse = queryOverride !== undefined ? queryOverride : searchQuery;

    onSearch(queryToUse);
    onCommunitySelect(normalizedCommunity || null, selectedComm?.name || null);
  };

  const handleSearch = () => {
    applyFilters();
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    applyFilters('');
  };

  const handleCommunityChange = (value: string) => {
    setSelectedCommunity(normalizeCommunity(value));
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
          <div className="flex flex-col gap-2 flex-1 min-w-[15rem]">
            <Label htmlFor="search">Search Rides</Label>
            <div className="relative">
              <Input
                id="search"
                placeholder="Search by location, keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pr-10"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground hover:text-primary"
                onClick={searchQuery ? handleSearchClear : handleSearch}
                aria-label={searchQuery ? 'Clear search' : 'Search'}
              >
                {searchQuery ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-[12rem] md:max-w-[16rem]">
            <Label htmlFor="community">Filter by Community</Label>
            <Select value={selectedCommunity || 'all'} onValueChange={handleCommunityChange}>
              <SelectTrigger id="community">
                <SelectValue placeholder="All communities" />
              </SelectTrigger>
              <SelectContent>
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
