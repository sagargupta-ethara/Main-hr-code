import React from 'react';

const StatusBadge = ({ status }) => {
  const getStatusColor = (status) => {
    if (!status) return 'bg-slate-100 text-slate-500 border-slate-200';
    const s = status.toLowerCase();
    if (s.includes('submit')) return 'bg-blue-50 text-blue-600 border-blue-200';
    if (s.includes('new')) return 'bg-sky-50 text-sky-600 border-sky-200';
    if (s.includes('shortlist')) return 'bg-violet-50 text-violet-600 border-violet-200';
    if (s.includes('interview') || s.includes('l1') || s.includes('l2') || s.includes('scheduled'))
      return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s.includes('select') || s.includes('offer') || s.includes('join') || s.includes('clear'))
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s.includes('reject') || s.includes('hold'))
      return 'bg-red-50 text-red-600 border-red-200';
    return 'bg-slate-100 text-slate-500 border-slate-200';
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${getStatusColor(status)}`}>
      {status || 'N/A'}
    </span>
  );
};

export default StatusBadge;
