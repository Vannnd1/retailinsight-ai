/**
 * SalesTrendChart.jsx
 * Area + line chart showing monthly revenue and transaction count over time.
 */

import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts';
import { formatMonth } from '../data/dataUtils';

// ── Custom tooltip ─────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{formatMonth(label)}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-medium text-slate-800">
            {p.dataKey === 'revenue'
              ? `£${p.value.toLocaleString()}`
              : p.value.toLocaleString()
            }
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * @param {object} props
 * @param {Array}  props.data            - Array of { month, revenue, qty, txns }
 * @param {string} [props.selectedCountry] - Currently selected country
 */
export default function SalesTrendChart({ data, selectedCountry }) {
  const hasCountry = selectedCountry && selectedCountry !== 'All';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-800">Sales Trend</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Monthly revenue and order volume {hasCountry ? `(${selectedCountry})` : ''}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

          <XAxis
            dataKey="month"
            tickFormatter={formatMonth}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />

          {/* Left Y axis: revenue */}
          <YAxis
            yAxisId="rev"
            tickFormatter={v => `£${(v / 1000).toFixed(0)}K`}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            width={60}
          />

          {/* Right Y axis: transactions */}
          <YAxis
            yAxisId="txn"
            orientation="right"
            tickFormatter={v => v.toLocaleString()}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            width={45}
          />

          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />

          <Area
            yAxisId="rev"
            type="monotone"
            dataKey="revenue"
            name="Revenue (£)"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#revenueGrad)"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />

          <Line
            yAxisId="txn"
            type="monotone"
            dataKey="txns"
            name="Orders"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
