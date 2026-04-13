import React from 'react';

const StatusBadge = ({ status }) => {
  const getStatusColor = (status) => {
    if (!status) return 'bg-slate-100 text-slate-700';
    const s = status.toLowerCase();
    if (s.includes('new')) return 'bg-blue-50 text-blue-700';
    if (s.includes('shortlist')) return 'bg-purple-50 text-purple-700';
    if (s.includes('interview') || s.includes('l1') || s.includes('l2'))
      return 'bg-amber-50 text-amber-700';
    if (s.includes('select') || s.includes('offer') || s.includes('join'))
      return 'bg-emerald-50 text-emerald-700';
    if (s.includes('reject') || s.includes('hold')) return 'bg-rose-50 text-rose-700';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(
        status
      )}`}
    >
      {status || 'N/A'}
    </span>
  );
};

export default StatusBadge;
