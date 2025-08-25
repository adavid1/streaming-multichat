import React from 'react';
import { Search } from 'lucide-react';
import type { PlatformFilters } from '../../../shared/types';

interface FilterControlsProps {
  filters: PlatformFilters;
  searchQuery: string;
  onFilterChange: (platform: keyof PlatformFilters, enabled: boolean) => void;
  onSearchChange: (query: string) => void;
}

const platformLabels = {
  twitch: 'Twitch',
  youtube: 'YouTube',
  tiktok: 'TikTok',
};

const platformColors = {
  twitch: 'text-purple-400 border-purple-400',
  youtube: 'text-red-400 border-red-400',
  tiktok: 'text-pink-400 border-pink-400',
};

export const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  searchQuery,
  onFilterChange,
  onSearchChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Platform Filters */}
      <div>
        <h3 className="text-sm font-medium text-chat-muted mb-2">Platforms</h3>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(filters) as Array<keyof PlatformFilters>).map((platform) => (
            <label
              key={platform}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer
                transition-colors duration-200
                ${filters[platform] 
                  ? `${platformColors[platform]} bg-opacity-20` 
                  : 'text-gray-500 border-gray-600 hover:border-gray-500'
                }
              `}
            >
              <input
                type="checkbox"
                checked={filters[platform]}
                onChange={(e) => onFilterChange(platform, e.target.checked)}
                className="sr-only"
              />
              <span className="text-sm font-medium">
                {platformLabels[platform]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Search Filter */}
      <div>
        <h3 className="text-sm font-medium text-chat-muted mb-2">Search Messages</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter by username or message..."
            className="
              w-full pl-10 pr-4 py-2 rounded-lg
              bg-gray-800 border border-gray-600
              text-chat-text placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              transition-all duration-200
            "
          />
        </div>
      </div>

      {/* Active Filters Summary */}
      {(searchQuery || Object.values(filters).some(f => !f)) && (
        <div className="pt-2 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-xs text-chat-muted">
              Active filters: {Object.values(filters).filter(Boolean).length}/3 platforms
              {searchQuery && ', search active'}
            </span>
            <button
              onClick={() => {
                onSearchChange('');
                (Object.keys(filters) as Array<keyof PlatformFilters>).forEach(platform => {
                  if (!filters[platform]) onFilterChange(platform, true);
                });
              }}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
};