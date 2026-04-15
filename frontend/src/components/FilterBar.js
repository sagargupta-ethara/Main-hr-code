import React from 'react';
import { Filter } from 'lucide-react';

const FilterBar = ({ filters, onFilterChange, onClearFilters, vendors = [], roles = [], stages = [] }) => {
  const sel = "bg-[var(--bg-raised)] border border-[var(--border-default)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500/50 min-w-[130px]";

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" strokeWidth={1.5} />
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Filter</span>
        </div>
        <select value={filters.vendor || 'all'} onChange={e => onFilterChange('vendor', e.target.value)} className={sel}>
          <option value="all">All Vendors</option>
          {vendors.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filters.role || 'all'} onChange={e => onFilterChange('role', e.target.value)} className={sel}>
          <option value="all">All Roles</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filters.stage || 'all'} onChange={e => onFilterChange('stage', e.target.value)} className={sel}>
          <option value="all">All Stages</option>
          {stages.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(filters.vendor || filters.role || filters.stage) && (
          <button onClick={onClearFilters} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold">Clear</button>
        )}
      </div>
    </div>
  );
};
export default FilterBar;
