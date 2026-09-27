/**
 * TopProductsChart.jsx
 * Horizontal bar chart + table for the top products by revenue.
 */

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell
} from 'recharts';

const COLORS = [
  '#10b981', '#059669', '#34d399', '#6ee7b7', '#a7f3d0',
  '#14b8a6', '#0d9488', '#2dd4bf', '#5eead4', '#99f6e4',
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1 max-w-[180px] truncate">{d.description}</p>
      <p className="text-slate-400 mb-1">{d.stockCode}</p>
      <div className="space-y-0.5">
        <div className="flex gap-2">
          <span className="text-slate-500">Revenue:</span>
          <span className="font-medium">£{d.revenue.toLocaleString()}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-slate-500">Qty Sold:</span>
          <span className="font-medium">{d.qty.toLocaleString()}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-slate-500">Orders:</span>
          <span className="font-medium">{d.txns.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {Array}  props.data            - Array of { stockCode, description, revenue, qty, txns }
 * @param {string} [props.selectedCountry] - Currently selected country
 */
export default function TopProductsChart({ data, selectedCountry }) {
  // Truncate labels for chart display
  const chartData = data.slice(0, 10).map(p => ({
    ...p,
    label: p.description.length > 22
      ? p.description.substring(0, 22) + '…'
      : p.description,
  }));

  const hasCountry = selectedCountry && selectedCountry !== 'All';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-slate-800">Top Products</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          Top 10 products by revenue {hasCountry ? `in ${selectedCountry}` : 'globally'}
        </p>
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
            dataKey="label"
            width={130}
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
          <Bar dataKey="revenue" name="Revenue" radius={[0, 6, 6, 0]} maxBarSize={22}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Mini table for details */}
      <div className="mt-4 border-t border-slate-100 pt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400">
              <th className="text-left pb-2 font-medium">#</th>
              <th className="text-left pb-2 font-medium">Product</th>
              <th className="text-right pb-2 font-medium">Revenue</th>
              <th className="text-right pb-2 font-medium">Qty</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 5).map((p, i) => (
              <tr key={p.stockCode} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="py-1.5 pr-2 text-slate-400">{i + 1}</td>
                <td className="py-1.5 pr-2 text-slate-700 max-w-[160px]">
                  <span className="block truncate">{p.description}</span>
                  <span className="text-slate-400">{p.stockCode}</span>
                </td>
                <td className="py-1.5 text-right font-medium text-slate-800">
                  £{p.revenue.toLocaleString()}
                </td>
                <td className="py-1.5 text-right text-slate-500">
                  {p.qty.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
