// Stock reservations for click-and-collect orders.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const BRANCHES = new Set(['KKN', 'ROE', 'UDN']);
const VAT_RATE = 0.07;

export function reserve(stock, sku, qty) {
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new RangeError('qty must be a whole number greater than 0');
  }
  const item = stock.find((s) => s.sku === String(sku).toUpperCase());
  if (!item) throw new RangeError(`Unknown SKU "${sku}"`);
  if (item.onHand < qty) {
    throw new RangeError(`Only ${item.onHand} in stock for ${item.sku}, cannot reserve ${qty}`);
  }
  item.onHand -= qty;
  return item;
}

// Works in satang (integers) so there is no floating-point drift, then formats once.
export function priceWithVat(unitPriceBaht, qty) {
  const satang = Math.round(unitPriceBaht * 100) * qty;
  const total = Math.round(satang * (1 + VAT_RATE)) / 100;
  return `฿${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function registerRoutes(app) {
  app.get('/api/reservations/export', async (req, res) => {
    const branch = String(req.query.branch ?? '').toUpperCase();
    if (!BRANCHES.has(branch)) {
      return res.status(400).json({ error: 'Unknown branch. Use one of: KKN, ROE, UDN.' });
    }
    const csv = await readFile(join('exports', `${branch}.csv`), 'utf8');
    res.type('text/csv').send(csv);
  });

  app.post('/api/reservations/notify', async (_req, res) => {
    const key = process.env.SUPPLIER_API_KEY;
    if (!key) return res.status(500).json({ error: 'SUPPLIER_API_KEY is not set' });
    const r = await fetch('https://supplier.example.com/notify', { headers: { Authorization: `Bearer ${key}` } });
    res.json({ status: r.status });
  });
}
