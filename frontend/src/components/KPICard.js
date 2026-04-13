import React from 'react';

const KPICard = ({ title, value, subtitle, trend, icon: Icon, onClick, testId }) => {
  return (
    <div
      data-testid={testId}
      onClick={onClick}
      className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 card-glow ${
        onClick ? 'cursor-pointer card-glow-hover transition-all duration-300' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-2">
            {title}
          </p>
          <p className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent font-mono mb-1">
            {value}
          </p>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="ml-4 p-3 bg-gradient-to-br from-cyan-500/10 to-teal-500/10 rounded-xl border border-cyan-500/20">
            <Icon className="w-6 h-6 text-cyan-400" strokeWidth={1.5} />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-800">
          <span className={`text-xs font-semibold ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
          <span className="text-xs text-slate-500 ml-1">vs last period</span>
        </div>
      )}
    </div>
  );
};

export default KPICard;
