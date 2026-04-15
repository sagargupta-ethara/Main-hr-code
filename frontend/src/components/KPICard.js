import React from 'react';

const KPICard = ({ title, value, subtitle, description, trend, icon: Icon, onClick, testId, color }) => {
  const colorMap = {
    blue:    { bg: 'bg-blue-50', border: 'border-blue-100', value: 'text-blue-600', icon: 'bg-blue-100 text-blue-600' },
    green:   { bg: 'bg-emerald-50', border: 'border-emerald-100', value: 'text-emerald-600', icon: 'bg-emerald-100 text-emerald-600' },
    red:     { bg: 'bg-red-50', border: 'border-red-100', value: 'text-red-500', icon: 'bg-red-100 text-red-500' },
    purple:  { bg: 'bg-violet-50', border: 'border-violet-100', value: 'text-violet-600', icon: 'bg-violet-100 text-violet-600' },
    amber:   { bg: 'bg-amber-50', border: 'border-amber-100', value: 'text-amber-600', icon: 'bg-amber-100 text-amber-600' },
    default: { bg: 'bg-white', border: 'border-slate-200', value: 'text-slate-800', icon: 'bg-slate-100 text-slate-600' },
  };
  const c = colorMap[color] || colorMap.default;

  return (
    <div
      data-testid={testId}
      onClick={onClick}
      className={`${c.bg} border ${c.border} rounded-2xl p-5 ${onClick ? 'cursor-pointer hover:shadow-md transition-all duration-200' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">{title}</p>
          <p className={`text-3xl font-bold ${c.value} font-mono mb-0.5`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          {description && <p className="text-[11px] text-slate-400 mt-1">{description}</p>}
        </div>
        {Icon && (
          <div className={`ml-3 p-2.5 rounded-xl ${c.icon}`}>
            <Icon className="w-5 h-5" strokeWidth={1.5} />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-200/60">
          <span className={`text-xs font-semibold ${trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-xs text-slate-400 ml-1">vs last period</span>
        </div>
      )}
    </div>
  );
};

export default KPICard;
