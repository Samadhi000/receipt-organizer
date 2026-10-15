import { OcrLine } from './ocr';

// ---------------------------------------------------------------------------
// Receipt parser (v3 — handles single-line AND two-line item layouts)
// ---------------------------------------------------------------------------
// ML Kit returns receipt text grouped by COLUMN, not by visual row, so we
// rebuild visual rows from each line's bounding box, then classify each row.
//
// Real receipts come in two shapes:
//   • single-line:  "Milk Powder 400g            850.00"   (name + amount together)
//   • two-line:     "1 935008:CHICKEN FULL BREAST SKINLESS"
//                   "   1,780.00   0.782         1,391.96"  (amount on the NEXT row)
//
// We handle both by carrying a pending item NAME forward: a name-only row is
// remembered, and the next amount-only row is paired with it. The grand total,
// look-alike traps ("Total Qty"), unit-price sub-lines and summary rows are all
// filtered, and OCR number spacing ("2, 940. 76") is normalised first.
// ---------------------------------------------------------------------------

export interface ParsedItem {
  name: string;
  price: number;
}

export interface ParsedReceipt {
  merchant: string;
  date: number | null;
  items: ParsedItem[];
  total: number | null;
  quality: 'ok' | 'poor';
  priceCount: number;
}

const PRICE_G = /(\d{1,3}(?:,\d{3})+\.\d{2}|\d+\.\d{2})/g;
const DATE_RE = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/;
const TOTAL_RE = /(grand\s*total|net\s*amount|bill\s*amount|amount\s*due|balance\s*due|\btotal\b|\bpayable\b)/i;
const TOTAL_TRAP_RE = /(sub\s*total|total\s*qty|total\s*quantity|number\s*of\s*item|total\s*discount|total\s*credit|item\s*count)/i;
const NON_ITEM_RE =
  /(sub\s*total|grand\s*total|net\s*amount|bill\s*amount|gross\s*amount|balance|\bcash\b|\bchange\b|\bvat\b|\btax\b|\bdiscount\b|thank|\btel\b|\bfax\b|\bno\.|street|road|colombo|kandy|galle|invoice|\bbill\b|charge|service|tender|cheque|credit|\bqty\b|quantity|description|\brate\b|\bamount\b|number\s*of|software|hotline|e-?mail|www|\bpax\b|table|served|cashier|customer|signature|store\s*code|points|redeem|notice)/i;

function median(nums: number[]): number {
  const s = nums.filter((n) => n > 0).sort((a, b) => a - b);
  if (!s.length) return 0;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const parsePrice = (s: string) => parseFloat(s.replace(/,/g, ''));

// Fix OCR spacing inside numbers: "2, 940. 76" -> "2,940.76".
const normalizeRow = (t: string) =>
  t
    .replace(/(\d),\s+(\d{3})/g, '$1,$2') // comma group: "2, 940" -> "2,940"
    .replace(/(\d)\.\s+(\d{2})\b/g, '$1.$2') // decimal: "940. 76" -> "940.76"
    .replace(/\s+/g, ' ')
    .trim();

// Clean an item name: drop the leading line-number + item-code ("1 935008:"),
// any "@ unit-price" tail, and stray leading/trailing quantity numbers.
function cleanName(s: string): string {
  return s
    .replace(/^\s*\d+\s+\d+\s*:\s*/, '') // "1 935008:"
    .replace(/^\s*\d+\s*:\s*/, '')        // "935008:"
    .replace(/\b\d+\s*[@x]\s*.*$/i, '')   // "@ 1500.00"
    .replace(/^\s*\d+(\.\d+)?\s+/, '')     // leading qty
    .replace(/\s+\d+(\.\d+)?$/, '')        // trailing qty
    .replace(/\s+/g, ' ')
    .trim();
}

function groupRows(lines: OcrLine[]): string[] {
  const sorted = [...lines].sort((a, b) => a.top - b.top);
  const lineH = median(sorted.map((l) => l.height)) || 16;
  const tol = Math.max(lineH * 0.9, 11);

  const rows: OcrLine[][] = [];
  const centres: number[] = [];
  for (const line of sorted) {
    const cy = line.top + line.height / 2;
    let placed = false;
    for (let i = 0; i < rows.length; i++) {
      if (Math.abs(centres[i] - cy) <= tol) {
        rows[i].push(line);
        centres[i] = (centres[i] * (rows[i].length - 1) + cy) / rows[i].length;
        placed = true;
        break;
      }
    }
    if (!placed) {
      rows.push([line]);
      centres.push(cy);
    }
  }
  for (const r of rows) r.sort((a, b) => a.left - b.left);
  return rows.map((r) => normalizeRow(r.map((l) => l.text).join(' ')));
}

function toEpoch(m: RegExpMatchArray): number {
  let year = parseInt(m[3], 10);
  if (year < 100) year += 2000;
  return new Date(year, parseInt(m[2], 10) - 1, parseInt(m[1], 10)).getTime();
}

export function parseReceipt(lines: OcrLine[]): ParsedReceipt {
  const rows = groupRows(lines);

  let merchant = 'Unknown';
  for (const t of rows) if (/[A-Za-z]{3,}/.test(t)) { merchant = t; break; }

  let date: number | null = null;
  for (const t of rows) {
    const m = t.match(DATE_RE);
    if (m) { date = toEpoch(m); break; }
  }

  const items: ParsedItem[] = [];
  const totalCandidates: number[] = [];
  const allPrices: number[] = [];
  let pendingName: string | null = null; // a name row awaiting its amount row

  for (const t of rows) {
    const pm = t.match(PRICE_G) ?? [];
    pm.forEach((p) => allPrices.push(parsePrice(p)));

    let name = t;
    for (const p of pm) name = name.replace(p, ' ');
    name = cleanName(name);

    const hasName = /[A-Za-z]{2,}/.test(name);
    const hasPrice = pm.length > 0;
    const amount = hasPrice ? parsePrice(pm[pm.length - 1]) : 0; // rightmost = line amount

    // Grand total (single-line label + amount).
    if (hasPrice && TOTAL_RE.test(t) && !TOTAL_TRAP_RE.test(t)) {
      totalCandidates.push(amount);
      pendingName = null;
      continue;
    }
    // Summary / header / payment rows.
    if (NON_ITEM_RE.test(t)) {
      pendingName = null;
      continue;
    }

    if (hasName && hasPrice) {
      // single-line item
      if (amount > 0) items.push({ name, price: amount });
      pendingName = null;
    } else if (hasName && !hasPrice) {
      // name only — remember it for the amount row below (two-line layout)
      pendingName = name;
    } else if (!hasName && hasPrice) {
      // amount only — pair with the pending name from the row above
      if (pendingName && amount > 0) {
        items.push({ name: pendingName, price: amount });
      }
      pendingName = null;
    }
  }

  const maxItem = items.length ? Math.max(...items.map((i) => i.price)) : 0;
  const validTotals = totalCandidates.filter((t) => t >= maxItem);
  let total: number | null = null;
  if (validTotals.length) total = Math.max(...validTotals);
  else if (allPrices.length) total = Math.max(...allPrices);
  else total = items.reduce((s, i) => s + i.price, 0) || null;

  const priceCount = allPrices.length;
  const quality: 'ok' | 'poor' = priceCount >= 2 ? 'ok' : 'poor';

  return { merchant, date, items, total, quality, priceCount };
}
