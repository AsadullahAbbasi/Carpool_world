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
import { Search } from 'lucide-react';
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

  const handleSearch = () => {
    onSearch(searchQuery);
    const selectedComm = communities.find(c => c.id === selectedCommunity);
    onCommunitySelect(selectedCommunity || null, selectedComm?.name || null);
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedCommunity('');
    onSearch('');
    onCommunitySelect(null, null);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Rides</Label>
              <Input
                id="search"
                placeholder="Search by location, keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="community">Filter by Community</Label>
              <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
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
          <div className="flex gap-2">
            <Button onClick={handleSearch} className="flex-1">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            <Button onClick={handleReset} variant="outline">
              Reset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchBar;
