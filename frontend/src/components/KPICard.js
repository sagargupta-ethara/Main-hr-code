import React from 'react';

const KPICard = ({ title, value, subtitle, description, icon: Icon, onClick, testId, accent }) => {
  // accent: 'cyan' | 'green' | 'red' | 'violet' | 'amber' | default
  const a = {
    cyan:   { ring: 'border-cyan-500/20', val: 'text-cyan-400', iconBg: 'bg-cyan-500/10 text-cyan-400' },
    green:  { ring: 'border-emerald-500/20', val: 'text-emerald-400', iconBg: 'bg-emerald-500/10 text-emerald-400' },
    red:    { ring: 'border-red-500/20', val: 'text-red-400', iconBg: 'bg-red-500/10 text-red-400' },
    violet: { ring: 'border-violet-500/20', val: 'text-violet-400', iconBg: 'bg-violet-500/10 text-violet-400' },
    amber:  { ring: 'border-amber-500/20', val: 'text-amber-400', iconBg: 'bg-amber-500/10 text-amber-400' },
  }[accent] || { ring: 'border-[var(--border-default)]', val: 'text-cyan-400', iconBg: 'bg-[var(--bg-raised)] text-[var(--text-secondary)]' };

  return (
    <div data-testid={testId} onClick={onClick}
      className={`bg-[var(--bg-card)] border ${a.ring} rounded-xl p-5 ${onClick ? 'cursor-pointer hover:border-cyan-500/40 transition-all duration-200' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1.5">{title}</p>
          <p className={`text-3xl font-bold ${a.val} font-mono`}>{value}</p>
          {subtitle && <p className="text-xs text-[var(--text-secondary)] mt-1">{subtitle}</p>}
          {description && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{description}</p>}
        </div>
        {Icon && <div className={`ml-3 p-2.5 rounded-lg ${a.iconBg}`}><Icon className="w-5 h-5" strokeWidth={1.5} /></div>}
      </div>
    </div>
  );
};
export default KPICard;
