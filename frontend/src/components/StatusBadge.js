import React from 'react';

const StatusBadge = ({ status }) => {
  const c = (s => {
    if (!s) return 'bg-[var(--bg-raised)] text-[var(--text-muted)] border-[var(--border-default)]';
    s = s.toLowerCase();
    if (s.includes('submit')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (s.includes('new'))    return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    if (s.includes('shortlist') || s.includes('screening')) return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
    if (s.includes('interview') || s.includes('l1') || s.includes('l2') || s.includes('scheduled'))
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (s.includes('select') || s.includes('offer') || s.includes('join') || s.includes('clear'))
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (s.includes('reject') || s.includes('hold'))
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    return 'bg-[var(--bg-raised)] text-[var(--text-muted)] border-[var(--border-default)]';
  })(status);

  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${c}`}>{status || 'N/A'}</span>;
};
export default StatusBadge;
