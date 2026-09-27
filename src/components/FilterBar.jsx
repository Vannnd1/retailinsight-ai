/**
 * FilterBar.jsx
 * Interactive filter controls for date range, country, and product search.
 * All filter changes propagate up via the onFilterChange callback.
 */

import { useState } from 'react';
import { Search, RotateCcw, Filter } from 'lucide-react';
import { kpis } from '../data/dataUtils';

// Generate all months between start and end
function getMonthOptions(start, end) {
  const options = [];
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const label = new Date(y, m - 1, 1).toLocaleDateString('en-GB', {
      month: 'short', year: 'numeric'
    });
    options.push({ value: key, label });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return options;
}

const monthOptions = getMonthOptions(kpis.dateRange.start, kpis.dateRange.end);

/**
 * @param {object} props
 * @param {object}   props.filters       - Current filter state
 * @param {function} props.onFilterChange - Callback(newFilters)
 */
export default function FilterBar({ filters, onFilterChange }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onFilterChange({
      startMonth:    kpis.dateRange.start,
      endMonth:      kpis.dateRange.end,
      country:       'All',
      productSearch: '',
    });
  };

  const hasActiveFilters =
    filters.startMonth !== kpis.dateRange.start ||
    filters.endMonth   !== kpis.dateRange.end   ||
    filters.country    !== 'All'                ||
    filters.productSearch !== '';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none"
        onClick={() => setIsExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Filters</span>
          {hasActiveFilters && (
            <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={e => { e.stopPropagation(); handleReset(); }}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
            >
              <RotateCcw size={12} />
              Reset
            </button>
          )}
          <span className="text-slate-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Filter controls */}
      {isExpanded && (
        <div className="px-5 pb-4 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">

            {/* Start Month */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500">From Month</label>
              <select
                value={filters.startMonth}
                onChange={e => handleChange('startMonth', e.target.value)}
                className="
                  text-sm text-slate-700 bg-slate-50 border border-slate-200
                  rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300
                  transition-all cursor-pointer
                "
              >
                {monthOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* End Month */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500">To Month</label>
              <select
                value={filters.endMonth}
                onChange={e => handleChange('endMonth', e.target.value)}
                className="
                  text-sm text-slate-700 bg-slate-50 border border-slate-200
                  rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300
                  transition-all cursor-pointer
                "
              >
                {monthOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Country */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500">Country</label>
              <select
                value={filters.country}
                onChange={e => handleChange('country', e.target.value)}
                className="
                  text-sm text-slate-700 bg-slate-50 border border-slate-200
                  rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300
                  transition-all cursor-pointer
                "
              >
                <option value="All">All Countries</option>
                {kpis.countries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Product Search */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500">Product Search</label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={filters.productSearch}
                  onChange={e => handleChange('productSearch', e.target.value)}
                  placeholder="Name or code…"
                  className="
                    w-full text-sm text-slate-700 bg-slate-50 border border-slate-200
                    rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300
                    transition-all placeholder-slate-400
                  "
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
