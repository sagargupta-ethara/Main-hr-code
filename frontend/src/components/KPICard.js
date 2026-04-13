import React from 'react';

const KPICard = ({ title, value, subtitle, trend, icon: Icon, onClick, testId }) => {
  return (
    <div
      data-testid={testId}
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-md p-6 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-sm hover:border-blue-200 transition-all duration-200' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-2">
            {title}
          </p>
          <p className="text-3xl font-bold text-slate-900 font-mono mb-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="ml-4 p-2 bg-blue-50 rounded-md">
            <Icon className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <span className={`text-xs font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
          <span className="text-xs text-slate-500 ml-1">vs last period</span>
        </div>
      )}
    </div>
  );
};

export default KPICard;
