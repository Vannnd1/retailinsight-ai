/**
 * dataUtils.js
 * Utility functions for loading pre-processed JSON data and computing
 * filtered aggregations for the dashboard.
 */

// ── Static JSON imports (bundled at build time) ──────────────────────────────
import rawKpis              from './kpis.json';
import rawSalesTrend        from './salesTrend.json';
import rawRevenueByCountry  from './revenueByCountry.json';
import rawTopProducts       from './topProducts.json';
import rawTopCustomers      from './topCustomers.json';
import rawCustomerHistogram from './customerHistogram.json';
import rawSampleRows        from './sampleRows.json';
import rawMonthlyCountry     from './monthlyCountry.json';
import rawCountryTopProducts from './countryTopProducts.json';
import rawAllCustomers       from './allCustomers.json';

// ── Re-export raw data ───────────────────────────────────────────────────────
export const kpis              = rawKpis;
export const salesTrend        = rawSalesTrend;
export const revenueByCountry  = rawRevenueByCountry;
export const topProducts       = rawTopProducts;
export const topCustomers      = rawTopCustomers;
export const customerHistogram = rawCustomerHistogram;
export const sampleRows        = rawSampleRows;
export const monthlyCountry     = rawMonthlyCountry;
export const countryTopProducts = rawCountryTopProducts;
export const allCustomers       = rawAllCustomers;

// ── Spend Tiers Definition ───────────────────────────────────────────────────
export const SPEND_TIERS = [
  { min: 0,      max: 100,      range: '< £100',     tier: 'Micro' },
  { min: 100,    max: 250,      range: '£100–£250',  tier: 'Low' },
  { min: 250,    max: 500,      range: '£250–£500',  tier: 'Casual' },
  { min: 500,    max: 1000,     range: '£500–£1k',   tier: 'Regular' },
  { min: 1000,   max: 2500,     range: '£1k–£2.5k',  tier: 'Loyal' },
  { min: 2500,   max: 5000,     range: '£2.5k–£5k',  tier: 'High Value' },
  { min: 5000,   max: 10000,    range: '£5k–£10k',   tier: 'Premium' },
  { min: 10000,  max: Infinity, range: '> £10k',     tier: 'VIP / B2B' },
];

// ── Formatting helpers ────────────────────────────────────────────────────────

/** Format a number as currency (GBP) */
export function formatCurrency(value) {
  if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000)     return `£${(value / 1_000).toFixed(1)}K`;
  return `£${value.toFixed(2)}`;
}

/** Format a large number with K/M suffix */
export function formatNumber(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

/** Format a month key "YYYY-MM" to a short label like "Dec 2010" */
export function formatMonth(monthKey) {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-');
  const date = new Date(+year, +month - 1, 1);
  return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

// ── Universal Filter logic ────────────────────────────────────────────────────

/**
 * Apply date, country, and product filters across all dashboard datasets.
 *
 * @param {object} filters - { startMonth, endMonth, country, productSearch }
 * @returns filtered versions of all chart datasets + KPI totals
 */
export function applyFilters(filters) {
  const { startMonth, endMonth, country, productSearch } = filters;

  const isMonthInRange = (m) => {
    if (startMonth && m < startMonth) return false;
    if (endMonth   && m > endMonth)   return false;
    return true;
  };

  const isCountryMatched = (c) => {
    return !country || country === 'All' || c === country;
  };

  // ── 1. Filter monthlyCountry by date & country ─────────────────────────────
  const relevantRows = monthlyCountry.filter(d => isMonthInRange(d.month) && isCountryMatched(d.country));

  // ── 2. Derive salesTrend by grouping relevant rows by month ────────────────
  const trendMap = {};
  relevantRows.forEach(d => {
    if (!trendMap[d.month]) {
      trendMap[d.month] = { month: d.month, revenue: 0, qty: 0, txns: 0 };
    }
    trendMap[d.month].revenue += d.revenue;
    trendMap[d.month].qty     += d.qty;
    trendMap[d.month].txns    += d.txns;
  });

  const filteredTrend = Object.values(trendMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(d => ({
      ...d,
      revenue: +d.revenue.toFixed(2),
    }));

  // ── 3. Derive revenueByCountry across selected date range ───────────────────
  const countryMap = {};
  monthlyCountry.filter(d => isMonthInRange(d.month)).forEach(d => {
    if (!countryMap[d.country]) {
      countryMap[d.country] = { country: d.country, revenue: 0, qty: 0, customers: 0 };
    }
    countryMap[d.country].revenue += d.revenue;
    countryMap[d.country].qty     += d.qty;
    countryMap[d.country].customers += d.customers;
  });

  const filteredCountryRevenue = Object.values(countryMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15)
    .map(d => ({
      ...d,
      revenue: +d.revenue.toFixed(2),
      isSelected: country && country !== 'All' ? d.country === country : false,
    }));

  // ── 4. Derive topProducts for the selected country / search ────────────────
  let baseProducts = [];
  if (country && country !== 'All' && countryTopProducts[country]) {
    baseProducts = countryTopProducts[country];
  } else {
    baseProducts = topProducts;
  }

  const search = productSearch?.toLowerCase().trim();
  const filteredProducts = search
    ? baseProducts.filter(p =>
        p.description.toLowerCase().includes(search) ||
        p.stockCode.toLowerCase().includes(search)
      )
    : baseProducts;

  // ── 5. Derive topCustomers & customerHistogram for selected country ────────
  const relevantCustomers = allCustomers.filter(c => isCountryMatched(c.country));
  const sortedCustomers = [...relevantCustomers].sort((a, b) => b.revenue - a.revenue);
  const filteredTopCustomers = sortedCustomers.slice(0, 8);

  const custRevenues = relevantCustomers.map(c => c.revenue);
  const filteredHistogram = SPEND_TIERS.map(({ range, tier, min, max }) => ({
    range,
    tier,
    count: custRevenues.filter(r => r >= min && r < max).length,
  }));

  // ── 6. Filtered KPIs ───────────────────────────────────────────────────────
  const totalRevenue = filteredTrend.reduce((s, d) => s + d.revenue, 0);
  const totalQty     = filteredTrend.reduce((s, d) => s + d.qty, 0);
  const totalTxns    = filteredTrend.reduce((s, d) => s + d.txns, 0);
  const totalCusts   = relevantCustomers.length;

  return {
    salesTrend:        filteredTrend,
    revenueByCountry:  filteredCountryRevenue,
    topProducts:       filteredProducts.slice(0, 10),
    topCustomers:      filteredTopCustomers,
    customerHistogram: filteredHistogram,
    kpis: {
      totalRevenue:      +totalRevenue.toFixed(2),
      totalTransactions: totalTxns,
      totalQtySold:      totalQty,
      totalCustomers:    totalCusts,
      dateRange: {
        start: startMonth || kpis.dateRange.start,
        end:   endMonth   || kpis.dateRange.end,
      },
      selectedCountry:   country,
    },
  };
}

// ── Context-Aware AI Context Builder ──────────────────────────────────────────
/**
 * Build rich, filter-aware dataset context for the AI prompt.
 *
 * @param {object} [filters]
 * @param {object} [filteredData]
 */
export function buildAiContext(filters, filteredData) {
  const currentFilters = filters || { country: 'All', startMonth: kpis.dateRange.start, endMonth: kpis.dateRange.end };
  const currentData    = filteredData || applyFilters(currentFilters);

  const topCountries = currentData.revenueByCountry.slice(0, 8)
    .map(c => `${c.country}: £${c.revenue.toLocaleString()} (${c.customers} customers)`)
    .join(', ');

  const topProds = currentData.topProducts.slice(0, 8)
    .map(p => `"${p.description}" (${p.stockCode}): £${p.revenue.toLocaleString()}, qty ${p.qty}`)
    .join('\n  ');

  const trendSummary = currentData.salesTrend
    .map(d => `${d.month}: £${d.revenue.toLocaleString()}, ${d.txns} orders`)
    .join('\n  ');

  const topCusts = currentData.topCustomers.slice(0, 8)
    .map(c => `Customer #${c.customerId} (${c.country}): £${c.revenue.toLocaleString()}, ${c.txns} purchases`)
    .join('\n  ');

  const histSummary = currentData.customerHistogram
    .map(b => `${b.range} (${b.tier}): ${b.count} customers`)
    .join(', ');

  const isFiltered = (currentFilters.country && currentFilters.country !== 'All') ||
    currentFilters.startMonth !== kpis.dateRange.start ||
    currentFilters.endMonth   !== kpis.dateRange.end;

  return `You are RetailInsight AI, an expert retail analytics assistant.
You have access to the Online Retail dataset.

${isFiltered ? `ACTIVE FILTER VIEW (The user is currently viewing this subset):
- Active Country: ${currentFilters.country}
- Active Date Range: ${currentFilters.startMonth} to ${currentFilters.endMonth}
- Total Revenue in this view: £${currentData.kpis.totalRevenue.toLocaleString()}
- Total Invoices in this view: ${currentData.kpis.totalTransactions.toLocaleString()}
- Total Units Sold in this view: ${currentData.kpis.totalQtySold.toLocaleString()}
- Total Unique Customers in this view: ${currentData.kpis.totalCustomers.toLocaleString()}
` : `DATASET OVERVIEW (Global full view):
- Period: ${kpis.dateRange.start} to ${kpis.dateRange.end}
- Total Revenue: £${kpis.totalRevenue.toLocaleString()}
- Total Transactions (Invoices): ${kpis.totalTransactions.toLocaleString()}
- Total Units Sold: ${kpis.totalQtySold.toLocaleString()}
- Total Unique Customers: ${kpis.totalCustomers.toLocaleString()}
- Total Countries served: ${kpis.countries.length}
`}

SALES TREND (Current View):
  ${trendSummary || 'No sales in this filter selection'}

TOP COUNTRIES (Ranked by revenue in selected period):
  ${topCountries}

TOP PRODUCTS (Current View):
  ${topProds || 'No products found'}

TOP CUSTOMERS (Current View):
  ${topCusts || 'No customers in this selection'}

CUSTOMER SPEND SEGMENTS (Current View):
  ${histSummary}

RULES & STRICT SCOPE GUARDRAILS:
1. EXCLUSIVE DOMAIN: You are strictly and exclusively an analytics assistant for this Online Retail dataset and dashboard.
2. REFUSAL POLICY (STRICT - DO NOT VIOLATE):
   - You are STRICTLY FORBIDDEN from answering any question outside the scope of retail business, dashboard analytics, or this dataset.
   - Topics strictly forbidden include: coding/programming (JavaScript, Python, etc.), politics, presidents, elections, celebrities, general history/geography not in dataset, recipes, creative writing, homework, entertainment, or general chit-chat.
   - If the user asks ANY question outside this domain:
     * DO NOT answer the question.
     * DO NOT provide code, trivia, facts, or explanations on that topic.
     * IMMEDIATELY refuse with exactly ONE short polite sentence matching the user's language:
       - Indonesian: "Maaf, saya hanya dapat menjawab pertanyaan seputar analisis data retail, performa penjualan, produk, dan pelanggan pada dashboard ini."
       - English: "I apologize, but I can only answer questions related to retail data, sales performance, products, and customer analytics on this dashboard."
3. TOKEN CONSERVATION:
   - Keep all responses concise, sharp, and directly answering the data question.
   - Do not add unnecessary conversational filler or preamble.
4. When answering valid questions, prioritize facts and numbers from the active filter view above.
5. Format currency in GBP (£) and use commas for thousands.`;
}

