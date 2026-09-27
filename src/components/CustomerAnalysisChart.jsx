/**
 * CustomerAnalysisChart.jsx
 * Two-panel customer analysis:
 *   1. Spend distribution histogram (bar chart)
 *   2. Top customers table
 */

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell
} from 'recharts';

const HISTOGRAM_COLORS = [
  '#38bdf8', // Micro (< £100)
  '#0ea5e9', // Low (£100–£250)
  '#6366f1', // Casual (£250–£500)
  '#8b5cf6', // Regular (£500–£1k)
  '#a855f7', // Loyal (£1k–£2.5k)
  '#ec4899', // High Value (£2.5k–£5k)
  '#f59e0b', // Premium (£5k–£10k)
  '#ef4444', // VIP / B2B (> £10k)
];

function HistogramTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="font-semibold text-slate-800">{d.range}</span>
        {d.tier && (
          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-blue-100">
            {d.tier}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-4 text-slate-600">
        <span>Customers:</span>
        <span className="font-semibold text-slate-900">{d.count.toLocaleString()}</span>
      </div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {Array}  props.histogram       - Array of { range, count, tier }
 * @param {Array}  props.topCustomers     - Array of { customerId, country, revenue, txns }
 * @param {string} [props.selectedCountry] - Currently selected country in filter
 */
export default function CustomerAnalysisChart({ histogram, topCustomers, selectedCountry }) {
  const isFiltered = selectedCountry && selectedCountry !== 'All';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-800">Customer Analysis</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Spend distribution by customer segment {isFiltered ? `(${selectedCountry})` : ''}
        </p>
      </div>

      {/* Spend histogram */}
      <ResponsiveContainer width="100%" height={210}>
        <BarChart
          data={histogram}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="range"
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            angle={-15}
            textAnchor="end"
            height={36}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            width={38}
          />
          <Tooltip content={<HistogramTooltip />} cursor={{ fill: '#f8fafc' }} />
          <Bar dataKey="count" name="Customers" radius={[4, 4, 0, 0]} maxBarSize={38}>
            {histogram.map((_, i) => (
              <Cell key={i} fill={HISTOGRAM_COLORS[i % HISTOGRAM_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Top customers table */}
      <div className="mt-4 border-t border-slate-100 pt-3 overflow-x-auto">
        <p className="text-xs font-medium text-slate-500 mb-2">
          Top 8 Customers by Spend {isFiltered ? `in ${selectedCountry}` : ''}
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400">
              <th className="text-left pb-2 font-medium">Customer ID</th>
              <th className="text-left pb-2 font-medium">Country</th>
              <th className="text-right pb-2 font-medium">Revenue</th>
              <th className="text-right pb-2 font-medium">Orders</th>
            </tr>
          </thead>
          <tbody>
            {topCustomers.slice(0, 8).map((c, i) => (
              <tr
                key={c.customerId}
                className="border-t border-slate-50 hover:bg-slate-50 transition-colors"
              >
                <td className="py-1.5 pr-2 font-medium text-slate-700">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ background: HISTOGRAM_COLORS[i % HISTOGRAM_COLORS.length] }}
                    >
                      {i + 1}
                    </span>
                    #{c.customerId}
                  </span>
                </td>
                <td className="py-1.5 pr-2 text-slate-500">{c.country}</td>
                <td className="py-1.5 text-right font-semibold text-slate-800">
                  £{c.revenue.toLocaleString()}
                </td>
                <td className="py-1.5 text-right text-slate-500">{c.txns.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
