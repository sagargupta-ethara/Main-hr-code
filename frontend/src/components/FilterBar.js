import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { X } from 'lucide-react';

const FilterBar = ({ filters, onFilterChange, onClearFilters }) => {
  const hasActiveFilters = Object.values(filters).some((v) => v);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <Select value={filters.vendor || ''} onValueChange={(v) => onFilterChange('vendor', v)}>
            <SelectTrigger data-testid="filter-vendor" className="bg-slate-800 border-slate-700 text-slate-200">
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-slate-200">All Vendors</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <Select value={filters.role || ''} onValueChange={(v) => onFilterChange('role', v)}>
            <SelectTrigger data-testid="filter-role" className="bg-slate-800 border-slate-700 text-slate-200">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-slate-200">All Roles</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <Select value={filters.stage || ''} onValueChange={(v) => onFilterChange('stage', v)}>
            <SelectTrigger data-testid="filter-stage" className="bg-slate-800 border-slate-700 text-slate-200">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-slate-200">All Stages</SelectItem>
              <SelectItem value="New" className="text-slate-200">New</SelectItem>
              <SelectItem value="Shortlisted" className="text-slate-200">Shortlisted</SelectItem>
              <SelectItem value="Interview Scheduled" className="text-slate-200">Interview Scheduled</SelectItem>
              <SelectItem value="L1 Interview" className="text-slate-200">L1 Interview</SelectItem>
              <SelectItem value="L2 Interview" className="text-slate-200">L2 Interview</SelectItem>
              <SelectItem value="Selected" className="text-slate-200">Selected</SelectItem>
              <SelectItem value="Offer Released" className="text-slate-200">Offer Released</SelectItem>
              <SelectItem value="Joined" className="text-slate-200">Joined</SelectItem>
              <SelectItem value="Rejected" className="text-slate-200">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {hasActiveFilters && (
          <button
            data-testid="clear-filters-btn"
            onClick={onClearFilters}
            className="flex items-center gap-1 px-4 py-2 text-sm text-slate-300 hover:text-white border border-slate-700 rounded-xl hover:bg-slate-800 transition-all font-semibold"
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
