import React from 'react';

const StatusBadge = ({ status }) => {
  const getStatusColor = (status) => {
    if (!status) return 'bg-slate-800 text-slate-400 border-slate-700';
    const s = status.toLowerCase();
    if (s.includes('new')) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    if (s.includes('shortlist')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (s.includes('interview') || s.includes('l1') || s.includes('l2'))
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (s.includes('select') || s.includes('offer') || s.includes('join'))
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (s.includes('reject') || s.includes('hold')) return 'bg-red-500/10 text-red-400 border-red-500/20';
    return 'bg-slate-800 text-slate-400 border-slate-700';
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border ${
        getStatusColor(status)
      }`}
    >
      {status || 'N/A'}
    </span>
  );
};

export default StatusBadge;
