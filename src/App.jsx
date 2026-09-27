/**
 * App.jsx — RetailInsight AI Dashboard
 *
 * Top-level component that:
 *   1. Manages global filter state
 *   2. Derives filtered data from the pre-processed JSON datasets
 *   3. Renders the full dashboard layout
 */

import { useState, useMemo } from 'react';
import {
  DollarSign, ShoppingCart, Package, Users, BarChart2,
  RefreshCw, Menu, X
} from 'lucide-react';

import {
  kpis,
  formatCurrency,
  formatNumber,
  applyFilters,
} from './data/dataUtils';

import FilterBar             from './components/FilterBar';
import KpiCard               from './components/KpiCard';
import SalesTrendChart       from './components/SalesTrendChart';
import RevenueByCountryChart from './components/RevenueByCountryChart';
import TopProductsChart      from './components/TopProductsChart';
import CustomerAnalysisChart from './components/CustomerAnalysisChart';
import AiAnalyst             from './components/AiAnalyst';

// ── Default filter state (full dataset, no restrictions) ─────────────────────
const DEFAULT_FILTERS = {
  startMonth:    kpis.dateRange.start,
  endMonth:      kpis.dateRange.end,
  country:       'All',
  productSearch: '',
};

// ── Gemini API key from Vite env variable (optional — user can also enter it) ─
const ENV_API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? '';

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [filters, setFilters]         = useState(DEFAULT_FILTERS);
  const [mobileNavOpen, setMobileNav] = useState(false);

  // ── Derive all chart data from current filters ────────────────────────────
  const filtered = useMemo(() => applyFilters(filters), [filters]);

  // ── KPI data for the card grid ────────────────────────────────────────────
  const kpiCards = [
    {
      title:    'Total Revenue',
      value:    formatCurrency(filtered.kpis.totalRevenue),
      subtitle: `${filtered.kpis.dateRange.start} – ${filtered.kpis.dateRange.end}`,
      icon:     <DollarSign size={20} />,
      color:    'blue',
    },
    {
      title:    'Total Transactions',
      value:    formatNumber(filtered.kpis.totalTransactions),
      subtitle: filters.country !== 'All' ? `Orders in ${filters.country}` : `Unique invoices processed`,
      icon:     <ShoppingCart size={20} />,
      color:    'purple',
    },
    {
      title:    'Total Qty Sold',
      value:    formatNumber(filtered.kpis.totalQtySold),
      subtitle: `Units across all orders`,
      icon:     <Package size={20} />,
      color:    'green',
    },
    {
      title:    'Unique Customers',
      value:    formatNumber(filtered.kpis.totalCustomers),
      subtitle: filters.country !== 'All' ? `In ${filters.country}` : `${kpis.countries.length} countries`,
      icon:     <Users size={20} />,
      color:    'amber',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ──────────────────────────── NAVBAR ──────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart2 size={18} className="text-white" />
              </div>
              <div>
                <span className="font-bold text-slate-800 text-base leading-none block">
                  RetailInsight
                </span>
                <span className="text-xs text-blue-600 font-semibold leading-none block">
                  AI Dashboard
                </span>
              </div>
            </div>

            {/* Desktop nav info */}
            <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500">
              <span className="bg-slate-100 px-3 py-1.5 rounded-full">
                📅 {kpis.dateRange.start} → {kpis.dateRange.end}
              </span>
              <span className="bg-green-50 text-green-700 px-3 py-1.5 rounded-full font-medium">
                ● Live
              </span>
            </div>

            {/* Mobile menu toggle */}
            <button
              className="sm:hidden p-1.5 text-slate-600"
              onClick={() => setMobileNav(v => !v)}
            >
              {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* ──────────────────────────── MAIN LAYOUT ─────────────────────────── */}
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Page title */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Sales Analytics
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Online Retail Dataset · {(530104).toLocaleString()} transactions analysed
            </p>
          </div>
          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-300 px-3 py-2 rounded-lg transition-all self-start sm:self-auto"
          >
            <RefreshCw size={13} />
            Reset All Filters
          </button>
        </div>

        {/* ── FILTERS ── */}
        <FilterBar filters={filters} onFilterChange={setFilters} />

        {/* ── KPI CARDS ── */}
        <section aria-label="Key Performance Indicators">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((card) => (
              <KpiCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        {/* ── MAIN CHARTS: Sales Trend (full width) ── */}
        <section aria-label="Sales Trend">
          <SalesTrendChart
            data={filtered.salesTrend}
            selectedCountry={filters.country}
          />
        </section>

        {/* ── COUNTRY + PRODUCTS (side by side on large screens) ── */}
        <section
          aria-label="Revenue by Country and Top Products"
          className="grid grid-cols-1 xl:grid-cols-2 gap-6"
        >
          <RevenueByCountryChart
            data={filtered.revenueByCountry}
            onSelectCountry={(c) => setFilters(prev => ({ ...prev, country: c }))}
            selectedCountry={filters.country}
          />
          <TopProductsChart
            data={filtered.topProducts}
            selectedCountry={filters.country}
          />
        </section>

        {/* ── CUSTOMER ANALYSIS + AI ANALYST (side by side on large screens) ── */}
        <section
          aria-label="Customer Analysis and AI Analyst"
          className="grid grid-cols-1 xl:grid-cols-2 gap-6"
        >
          <CustomerAnalysisChart
            histogram={filtered.customerHistogram}
            topCustomers={filtered.topCustomers}
            selectedCountry={filters.country}
          />
          <AiAnalyst
            apiKey={ENV_API_KEY}
            activeFilters={filters}
            filteredData={filtered}
          />
        </section>

        {/* ── FOOTER ── */}
        <footer className="text-center py-4 border-t border-slate-200 text-xs text-slate-400 space-y-0.5">
          <p className="font-medium text-slate-500">RetailInsight AI Dashboard</p>
          <p>
            Built with React · Tailwind CSS · Recharts · Gemini API ·{' '}
            <span className="text-blue-500">Online Retail Dataset (UCI ML Repository)</span>
          </p>
          <p>Data: Dec 2010 – Dec 2011 · {kpis.totalTransactions.toLocaleString()} invoices · {kpis.totalCustomers.toLocaleString()} customers · {kpis.countries.length} countries</p>
        </footer>
      </main>
    </div>
  );
}
