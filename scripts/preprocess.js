/**
 * Pre-processing script for the Online Retail CSV dataset.
 * Reads the raw CSV (~541k rows) and produces compact JSON summaries
 * that are bundled with the React app for fast in-browser use.
 *
 * Run: node scripts/preprocess.js
 *
 * Column order: InvoiceNo,StockCode,Description,Quantity,InvoiceDate,UnitPrice,CustomerID,Country
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CSV_PATH = resolve(__dirname, '../../online_retail.csv');
const OUT_DIR  = resolve(__dirname, '../src/data');
mkdirSync(OUT_DIR, { recursive: true });

// ─── Simple RFC-4180-compliant CSV row splitter ──────────────────────────────
function splitCsvRow(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

// ─── Aggregation buckets ─────────────────────────────────────────────────────
const monthlyRevenue      = {};   // "YYYY-MM" → { revenue, qty, txns: Set }
const countryRevenue      = {};   // country   → { revenue, qty, customers: Set }
const productRevenue      = {};   // stockCode → { description, revenue, qty, txns: Set }
const customerData        = {};   // customerId → { country, revenue, txns, firstDate, lastDate }
const monthlyCountryMap   = {};   // "YYYY-MM|country" → { revenue, qty, txns: Set, customers: Set }
const countryProductsMap  = {};   // country → stockCode → { description, revenue, qty, txns: Set }

let totalRevenue      = 0;
let totalQty          = 0;
const allInvoices     = new Set();
const allCustomers    = new Set();
let totalRows         = 0;
let skippedRows       = 0;

// ─── Row-level samples for the AI context (max 5000 valid rows) ─────────────
const sampleRows      = [];
const SAMPLE_MAX      = 5000;

// ─── Parse CSV ────────────────────────────────────────────────────────────────
console.log('Reading CSV…');
const raw   = readFileSync(CSV_PATH, 'utf8');
const lines = raw.split('\n');
console.log(`Total lines: ${lines.length}`);

for (let li = 1; li < lines.length; li++) {
  const line = lines[li].trim();
  if (!line) continue;

  const parts = splitCsvRow(line);
  if (parts.length < 8) { skippedRows++; continue; }

  const invoiceNo    = parts[0].trim();
  const stockCode    = parts[1].trim();
  const description  = parts[2].trim();
  const qtyStr       = parts[3].trim();
  const invoiceDate  = parts[4].trim();
  const unitPriceStr = parts[5].trim();
  const customerIdStr= parts[6].trim();
  const country      = parts[7].trim();

  // Skip cancelled orders (InvoiceNo starts with C)
  if (invoiceNo.startsWith('C')) { skippedRows++; continue; }

  const qty       = parseInt(qtyStr, 10);
  const unitPrice = parseFloat(unitPriceStr);

  // Skip rows with invalid numeric values
  if (!qty || qty <= 0 || isNaN(unitPrice) || unitPrice <= 0) { skippedRows++; continue; }

  const revenue  = qty * unitPrice;

  // Parse date  e.g. "2010-12-01 08:26:00"
  const dateParts = invoiceDate.split(' ');
  const dateStr   = dateParts[0]; // "YYYY-MM-DD"
  const monthKey  = dateStr.substring(0, 7); // "YYYY-MM"

  // ── Monthly ───────────────────────────────────────────────────────────────
  if (!monthlyRevenue[monthKey]) {
    monthlyRevenue[monthKey] = { revenue: 0, qty: 0, txns: new Set() };
  }
  monthlyRevenue[monthKey].revenue += revenue;
  monthlyRevenue[monthKey].qty     += qty;
  monthlyRevenue[monthKey].txns.add(invoiceNo);

  // ── Country ───────────────────────────────────────────────────────────────
  if (!countryRevenue[country]) {
    countryRevenue[country] = { revenue: 0, qty: 0, customers: new Set() };
  }
  countryRevenue[country].revenue += revenue;
  countryRevenue[country].qty     += qty;
  if (customerIdStr) countryRevenue[country].customers.add(customerIdStr);

  // ── Monthly Country rollup ────────────────────────────────────────────────
  const mcKey = `${monthKey}|${country}`;
  if (!monthlyCountryMap[mcKey]) {
    monthlyCountryMap[mcKey] = { revenue: 0, qty: 0, txns: new Set(), customers: new Set() };
  }
  monthlyCountryMap[mcKey].revenue += revenue;
  monthlyCountryMap[mcKey].qty     += qty;
  monthlyCountryMap[mcKey].txns.add(invoiceNo);
  if (customerIdStr) monthlyCountryMap[mcKey].customers.add(customerIdStr);

  // ── Product ───────────────────────────────────────────────────────────────
  if (!productRevenue[stockCode]) {
    productRevenue[stockCode] = { description, revenue: 0, qty: 0, txns: new Set() };
  }
  productRevenue[stockCode].revenue += revenue;
  productRevenue[stockCode].qty     += qty;
  productRevenue[stockCode].txns.add(invoiceNo);
  if (!productRevenue[stockCode].description && description) {
    productRevenue[stockCode].description = description;
  }

  // ── Country Products rollup ───────────────────────────────────────────────
  if (!countryProductsMap[country]) {
    countryProductsMap[country] = {};
  }
  if (!countryProductsMap[country][stockCode]) {
    countryProductsMap[country][stockCode] = { description, revenue: 0, qty: 0, txns: new Set() };
  }
  countryProductsMap[country][stockCode].revenue += revenue;
  countryProductsMap[country][stockCode].qty     += qty;
  countryProductsMap[country][stockCode].txns.add(invoiceNo);
  if (!countryProductsMap[country][stockCode].description && description) {
    countryProductsMap[country][stockCode].description = description;
  }

  // ── Customer ──────────────────────────────────────────────────────────────
  if (customerIdStr) {
    if (!customerData[customerIdStr]) {
      customerData[customerIdStr] = { country, revenue: 0, txns: 0, firstDate: dateStr, lastDate: dateStr };
    }
    customerData[customerIdStr].revenue += revenue;
    customerData[customerIdStr].txns    += 1;
    if (dateStr < customerData[customerIdStr].firstDate) customerData[customerIdStr].firstDate = dateStr;
    if (dateStr > customerData[customerIdStr].lastDate)  customerData[customerIdStr].lastDate  = dateStr;
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  totalRevenue += revenue;
  totalQty     += qty;
  allInvoices.add(invoiceNo);
  if (customerIdStr) allCustomers.add(customerIdStr);
  totalRows++;

  // ── Sample rows for AI ────────────────────────────────────────────────────
  if (sampleRows.length < SAMPLE_MAX) {
    sampleRows.push({
      invoiceNo, stockCode, description, qty, date: dateStr,
      unitPrice, revenue: +revenue.toFixed(2), customerId: customerIdStr, country,
    });
  }
}

console.log(`Processed ${totalRows} valid rows, skipped ${skippedRows}`);

// ── Serialize monthly ─────────────────────────────────────────────────────────
const salesTrend = Object.entries(monthlyRevenue)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([month, v]) => ({
    month,
    revenue: +v.revenue.toFixed(2),
    qty: v.qty,
    txns: v.txns.size,
  }));

// ── Serialize country (top 20 by revenue) ─────────────────────────────────────
const revenueByCountry = Object.entries(countryRevenue)
  .map(([country, v]) => ({
    country,
    revenue: +v.revenue.toFixed(2),
    qty: v.qty,
    customers: v.customers.size,
  }))
  .sort((a, b) => b.revenue - a.revenue)
  .slice(0, 20);

// ── Serialize top 20 products by revenue ─────────────────────────────────────
const topProducts = Object.entries(productRevenue)
  .map(([code, v]) => ({
    stockCode: code,
    description: v.description,
    revenue: +v.revenue.toFixed(2),
    qty: v.qty,
    txns: v.txns.size,
  }))
  .sort((a, b) => b.revenue - a.revenue)
  .slice(0, 20);

// ── Serialize customer segments ───────────────────────────────────────────────
const customerList = Object.entries(customerData)
  .map(([id, v]) => ({
    customerId: id,
    country: v.country,
    revenue: +v.revenue.toFixed(2),
    txns: v.txns,
    firstDate: v.firstDate,
    lastDate: v.lastDate,
  }))
  .sort((a, b) => b.revenue - a.revenue);

// Build customer spend histogram using realistic business spend tiers
const revenues = customerList.map(c => c.revenue);
const SPEND_TIERS = [
  { min: 0,      max: 100,      range: '< £100',     tier: 'Micro' },
  { min: 100,    max: 250,      range: '£100–£250',  tier: 'Low' },
  { min: 250,    max: 500,      range: '£250–£500',  tier: 'Casual' },
  { min: 500,    max: 1000,     range: '£500–£1k',   tier: 'Regular' },
  { min: 1000,   max: 2500,     range: '£1k–£2.5k',  tier: 'Loyal' },
  { min: 2500,   max: 5000,     range: '£2.5k–£5k',  tier: 'High Value' },
  { min: 5000,   max: 10000,    range: '£5k–£10k',   tier: 'Premium' },
  { min: 10000,  max: Infinity, range: '> £10k',     tier: 'VIP / B2B' },
];

const customerHistogram = SPEND_TIERS.map(({ range, tier, min, max }) => ({
  range,
  tier,
  count: revenues.filter(r => r >= min && r < max).length,
}));

// Top 50 customers for table
const topCustomers = customerList.slice(0, 50);

// Compact all customers for dynamic filtering
const allCustomersList = customerList.map(c => ({
  customerId: c.customerId,
  country: c.country,
  revenue: c.revenue,
  txns: c.txns,
}));

// Serialize monthly by country rollup
const monthlyCountryData = Object.entries(monthlyCountryMap).map(([key, v]) => {
  const [month, country] = key.split('|');
  return {
    month,
    country,
    revenue: +v.revenue.toFixed(2),
    qty: v.qty,
    txns: v.txns.size,
    customers: v.customers.size,
  };
});

// Serialize top 15 products for each country
const countryTopProducts = {};
for (const [c, pMap] of Object.entries(countryProductsMap)) {
  countryTopProducts[c] = Object.entries(pMap)
    .map(([code, v]) => ({
      stockCode: code,
      description: v.description,
      revenue: +v.revenue.toFixed(2),
      qty: v.qty,
      txns: v.txns.size,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15);
}

// ── Country list for filters ───────────────────────────────────────────────────
const countriesList = Object.keys(countryRevenue).sort();

// ── KPIs ───────────────────────────────────────────────────────────────────────
const kpis = {
  totalRevenue:      +totalRevenue.toFixed(2),
  totalTransactions: allInvoices.size,
  totalQtySold:      totalQty,
  totalCustomers:    allCustomers.size,
  dateRange: {
    start: salesTrend[0]?.month ?? '',
    end:   salesTrend[salesTrend.length - 1]?.month ?? '',
  },
  countries: countriesList,
  totalProducts: Object.keys(productRevenue).length,
};

// ── Write output files ────────────────────────────────────────────────────────
const write = (name, data) => {
  writeFileSync(resolve(OUT_DIR, name), JSON.stringify(data), 'utf8');
  console.log(`  ✓ ${name}`);
};

write('kpis.json',               kpis);
write('salesTrend.json',         salesTrend);
write('revenueByCountry.json',   revenueByCountry);
write('topProducts.json',        topProducts);
write('topCustomers.json',       topCustomers);
write('allCustomers.json',       allCustomersList);
write('monthlyCountry.json',     monthlyCountryData);
write('countryTopProducts.json', countryTopProducts);
write('customerHistogram.json',  customerHistogram);
write('sampleRows.json',         sampleRows);

console.log('Done.');

