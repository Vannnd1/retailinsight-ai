/**
 * RevenueByCountryChart.jsx
 * Horizontal bar chart showing top countries by revenue.
 */

import { useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell
} from 'recharts';

const COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#60a5fa', '#93c5fd', '#bfdbfe', '#1d4ed8', '#4f46e5',
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{d.country}</p>
      <div className="space-y-0.5">
        <div className="flex gap-2">
          <span className="text-slate-500">Revenue:</span>
          <span className="font-medium">£{d.revenue.toLocaleString()}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-slate-500">Customers:</span>
          <span className="font-medium">{d.customers.toLocaleString()}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-slate-500">Qty Sold:</span>
          <span className="font-medium">{d.qty.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {Array}    props.data             - Array of { country, revenue, qty, customers, isSelected }
 * @param {function} [props.onSelectCountry] - Callback(country) when a country bar is clicked
 * @param {string}   [props.selectedCountry] - Currently selected country in filter
 */
export default function RevenueByCountryChart({ data, onSelectCountry, selectedCountry }) {
  const [excludeUk, setExcludeUk] = useState(false);

  // Filter out UK if user chooses international markets view
  const filteredSource = excludeUk
    ? data.filter(d => d.country !== 'United Kingdom')
    : data;

  const chartData = [...filteredSource]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const isFiltered = selectedCountry && selectedCountry !== 'All';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-800">Revenue by Country</h3>
            {excludeUk && (
              <span className="text-[10px] bg-indigo-50 text-indigo-600 font-semibold px-2 py-0.5 rounded-full border border-indigo-100">
                International Only
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {excludeUk ? 'Top 10 export markets (UK excluded)' : 'Top 10 countries in selected period'}
            {isFiltered ? ` · Active: ${selectedCountry}` : ' · Click bar to filter'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle All vs Exclude UK */}
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
            <button
              onClick={() => setExcludeUk(false)}
              className={`px-2.5 py-1 rounded-md transition-all ${
                !excludeUk
                  ? 'bg-white text-blue-600 shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setExcludeUk(true)}
              className={`px-2.5 py-1 rounded-md transition-all ${
                excludeUk
                  ? 'bg-white text-blue-600 shadow-sm font-semibold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Excl. UK
            </button>
          </div>

          {isFiltered && onSelectCountry && (
            <button
              onClick={() => onSelectCountry('All')}
              className="text-[11px] bg-blue-50 text-blue-600 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors font-medium border border-blue-200"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            tickFormatter={v => `£${(v / 1000).toFixed(0)}K`}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            type="category"
            dataKey="country"
            width={110}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
          <Bar
            dataKey="revenue"
            name="Revenue"
            radius={[0, 6, 6, 0]}
            maxBarSize={22}
            className="cursor-pointer"
            onClick={(entry) => {
              if (onSelectCountry && entry?.country) {
                onSelectCountry(entry.country === selectedCountry ? 'All' : entry.country);
              }
            }}
          >
            {chartData.map((entry, index) => {
              const isSelected = isFiltered && entry.country === selectedCountry;
              const fill = isSelected
                ? '#2563eb'
                : (isFiltered ? '#cbd5e1' : COLORS[index % COLORS.length]);
              return (
                <Cell
                  key={index}
                  fill={fill}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
