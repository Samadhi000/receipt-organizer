import { getDb } from './database';
import { Category, Receipt } from '../types/models';
import { ParsedReceipt } from '../services/parser';
import { pickCategory } from '../services/categorizer';
import { newId } from '../utils/id';

// A receipt row plus a derived item count, for the list screen.
export interface ReceiptSummary extends Receipt {
  itemCount: number;
}

// Read all categories, splitting the stored CSV keyword column into an array.
export async function getCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: number;
    name: string;
    color: string;
    keywords: string;
  }>('SELECT id, name, color, keywords FROM categories ORDER BY id');

  return rows.map((r) => ({
    id: r.id,
    name: r.name as Category['name'],
    color: r.color,
    keywords: r.keywords ? r.keywords.split(',').map((k) => k.trim()).filter(Boolean) : [],
  }));
}

// Persist a parsed receipt and its categorized items in a single transaction,
// so a receipt is never saved without its items (or vice-versa).
export async function saveReceipt(
  parsed: ParsedReceipt,
  imageUri: string,
  rawText: string
): Promise<string> {
  const db = await getDb();
  const categories = await getCategories();

  const receiptId = newId();
  const now = Date.now();
  const purchasedAt = parsed.date ?? now;
  const itemsTotal = parsed.items.reduce((sum, it) => sum + it.price, 0);
  const total = parsed.total ?? itemsTotal;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO receipts (id, merchant, purchasedAt, total, imageUri, rawText, createdAt, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      receiptId,
      parsed.merchant,
      purchasedAt,
      total,
      imageUri,
      rawText,
      now
    );

    for (const it of parsed.items) {
      const categoryId = pickCategory(it.name, categories);
      await db.runAsync(
        'INSERT INTO items (id, receiptId, name, amount, categoryId) VALUES (?, ?, ?, ?, ?)',
        newId(),
        receiptId,
        it.name,
        it.price,
        categoryId
      );
    }
  });

  return receiptId;
}

// All receipts, newest first, each with a derived item count.
export async function getReceipts(): Promise<ReceiptSummary[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT r.*,
            (SELECT COUNT(*) FROM items i WHERE i.receiptId = r.id) AS itemCount
     FROM receipts r
     ORDER BY r.createdAt DESC`
  );

  return rows.map((r) => ({
    id: r.id,
    merchant: r.merchant,
    purchasedAt: r.purchasedAt,
    total: r.total,
    imageUri: r.imageUri ?? undefined,
    rawText: r.rawText,
    createdAt: r.createdAt,
    synced: r.synced === 1,
    itemCount: r.itemCount,
  }));
}

// ---- Report aggregations ---------------------------------------------------

export interface CategoryTotal {
  name: string;
  color: string;
  total: number;
}

export interface ShopTotal {
  merchant: string;
  total: number;
}

// Total spend per category, optionally limited to receipts on/after `sinceMs`.
export async function getCategoryTotals(sinceMs?: number): Promise<CategoryTotal[]> {
  const db = await getDb();
  const where = sinceMs ? 'WHERE r.purchasedAt >= ?' : '';
  const params = sinceMs ? [sinceMs] : [];
  const rows = await db.getAllAsync<any>(
    `SELECT c.name AS name, c.color AS color, SUM(i.amount) AS total
     FROM items i
     JOIN receipts r ON i.receiptId = r.id
     JOIN categories c ON i.categoryId = c.id
     ${where}
     GROUP BY c.id
     HAVING total > 0
     ORDER BY total DESC`,
    ...params
  );
  return rows.map((r) => ({ name: r.name, color: r.color, total: r.total }));
}

// Total spend per shop, optionally limited to receipts on/after `sinceMs`.
export async function getShopTotals(sinceMs?: number): Promise<ShopTotal[]> {
  const db = await getDb();
  const where = sinceMs ? 'WHERE purchasedAt >= ?' : '';
  const params = sinceMs ? [sinceMs] : [];
  const rows = await db.getAllAsync<any>(
    `SELECT merchant, SUM(total) AS total
     FROM receipts
     ${where}
     GROUP BY merchant
     ORDER BY total DESC`,
    ...params
  );
  return rows.map((r) => ({ merchant: r.merchant, total: r.total }));
}

// ---- Insights --------------------------------------------------------------

export interface Stats {
  receiptCount: number;
  totalSpend: number;
  avgReceipt: number;
  itemCount: number;
}

export async function getStats(): Promise<Stats> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ c: number; s: number }>(
    'SELECT COUNT(*) AS c, COALESCE(SUM(total), 0) AS s FROM receipts'
  );
  const it = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) AS c FROM items');
  const receiptCount = r?.c ?? 0;
  const totalSpend = r?.s ?? 0;
  return {
    receiptCount,
    totalSpend,
    avgReceipt: receiptCount ? totalSpend / receiptCount : 0,
    itemCount: it?.c ?? 0,
  };
}

export interface AnomalyItem {
  name: string;
  amount: number;
}

// Flag "unusual" purchases: items whose price is more than 2 standard
// deviations above the mean item price (a simple z-score outlier test).
export async function getAnomalies(): Promise<AnomalyItem[]> {
  const db = await getDb();
  const items = await db.getAllAsync<{ name: string; amount: number }>(
    'SELECT name, amount FROM items'
  );
  if (items.length < 3) return [];

  const amounts = items.map((i) => i.amount);
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance = amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / amounts.length;
  const std = Math.sqrt(variance);
  const threshold = mean + 2 * std;

  return items
    .filter((i) => i.amount > threshold)
    .sort((a, b) => b.amount - a.amount)
    .map((i) => ({ name: i.name, amount: i.amount }));
}

// Delete every receipt + item (categories are kept). Used by Settings.
export async function clearAllReceipts(): Promise<void> {
  const db = await getDb();
  await db.execAsync('DELETE FROM items; DELETE FROM receipts;');
}
