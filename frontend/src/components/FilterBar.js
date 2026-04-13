import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { X } from 'lucide-react';

const FilterBar = ({ filters, onFilterChange, onClearFilters }) => {
  const hasActiveFilters = Object.values(filters).some((v) => v);

  return (
    <div className="bg-white border border-slate-200 rounded-md p-4 mb-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <Select value={filters.vendor || ''} onValueChange={(v) => onFilterChange('vendor', v)}>
            <SelectTrigger data-testid="filter-vendor">
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <Select value={filters.role || ''} onValueChange={(v) => onFilterChange('role', v)}>
            <SelectTrigger data-testid="filter-role">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <Select value={filters.stage || ''} onValueChange={(v) => onFilterChange('stage', v)}>
            <SelectTrigger data-testid="filter-stage">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Shortlisted">Shortlisted</SelectItem>
              <SelectItem value="Interview Scheduled">Interview Scheduled</SelectItem>
              <SelectItem value="L1 Interview">L1 Interview</SelectItem>
              <SelectItem value="L2 Interview">L2 Interview</SelectItem>
              <SelectItem value="Selected">Selected</SelectItem>
              <SelectItem value="Offer Released">Offer Released</SelectItem>
              <SelectItem value="Joined">Joined</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <button
            data-testid="clear-filters-btn"
            onClick={onClearFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
