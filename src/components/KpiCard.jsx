/**
 * KpiCard.jsx
 * Displays a single KPI metric with icon, value, label, and optional trend.
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * @param {object} props
 * @param {string}   props.title     - Card label
 * @param {string}   props.value     - Formatted value to display
 * @param {string}   props.subtitle  - Secondary info line
 * @param {React.ReactNode} props.icon - Icon element
 * @param {string}   props.color     - Tailwind color class for accent (e.g. "blue")
 * @param {number}   [props.trend]   - % change vs comparison (optional)
 */
export default function KpiCard({ title, value, subtitle, icon, color = 'blue', trend }) {
  const colorMap = {
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',   border: 'border-blue-100' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', border: 'border-purple-100' },
    green:  { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-100' },
    amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-600',  border: 'border-amber-100' },
  };

  const c = colorMap[color] ?? colorMap.blue;

  const TrendIcon = trend == null ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-slate-400';

  return (
    <div className={`
      bg-white rounded-2xl border ${c.border}
      p-5 shadow-sm hover:shadow-md
      transition-all duration-200 cursor-default
      flex flex-col gap-3
    `}>
      {/* Header row: icon + optional trend badge */}
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.icon}`}>
          {icon}
        </div>
        {trend != null && TrendIcon && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon size={13} />
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div>
        <p className="text-2xl font-bold text-slate-800 leading-tight tracking-tight">
          {value}
        </p>
        <p className="text-sm font-medium text-slate-500 mt-0.5">{title}</p>
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-xs text-slate-400 border-t border-slate-100 pt-2">{subtitle}</p>
      )}
    </div>
  );
}
