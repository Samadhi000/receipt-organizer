// ---------------------------------------------------------------------------
// Validation layer
// ---------------------------------------------------------------------------
// A separate, pure module that reconciles the parsed line items against the
// receipt total. OCR is never perfect, so instead of trusting it blindly we
// CHECK it by arithmetic: do the item prices add up to the total?
//
//   • balanced -> items sum == total (within a cent)
//   • short    -> items sum <  total  (an item is likely missing, or the gap
//                 is tax / service charge)
//   • over     -> items sum >  total  (a duplicate or a wrong price)
//
// This informs the user (it never blocks), so they can add a missing item,
// fix a mis-read price, or correct a name before saving.
// ---------------------------------------------------------------------------

export type ValidationStatus = 'balanced' | 'short' | 'over' | 'empty';

export interface ValidationResult {
  itemsSum: number;
  total: number;
  difference: number; // total - itemsSum
  status: ValidationStatus;
  message: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function validateReceipt(
  items: { price: number }[],
  total: number
): ValidationResult {
  const itemsSum = round2(items.reduce((s, i) => s + (i.price || 0), 0));
  const difference = round2(total - itemsSum);

  let status: ValidationStatus;
  let message: string;

  if (items.length === 0) {
    status = 'empty';
    message = 'No items yet — add the items from your receipt.';
  } else if (Math.abs(difference) < 0.01) {
    status = 'balanced';
    message = 'Items add up to the total ✓';
  } else if (difference > 0) {
    status = 'short';
    message = `Items are Rs ${difference.toFixed(
      2
    )} short of the total — an item may be missing, or the gap is tax / service charge.`;
  } else {
    status = 'over';
    message = `Items exceed the total by Rs ${Math.abs(difference).toFixed(
      2
    )} — check for a duplicate line or a wrong price.`;
  }

  return { itemsSum, total: round2(total), difference, status, message };
}

// Flag an item name that looks unreadable (empty, or almost no letters) so the
// UI can nudge the user to check/fix it.
export function isNameSuspect(name: string): boolean {
  const n = name.trim();
  if (n.length === 0) return true;
  const letters = (n.match(/[A-Za-z]/g) || []).length;
  return letters < 2 || letters / n.length < 0.3;
}
