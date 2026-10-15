// Core data models for the Receipt & Expense Organizer.
// These shapes are shared by the database layer, the parser, and the UI.

// Fixed set of expense categories used to bucket individual items.
export type CategoryName =
  | 'Groceries'
  | 'Dining'
  | 'Transport'
  | 'Household'
  | 'Health'
  | 'Utilities'
  | 'Other';

export interface Category {
  id: number;
  name: CategoryName;
  color: string;      // hex colour, used later by the charts
  keywords: string[]; // words that map an item name to this category
}

// One scanned receipt (the header-level data).
export interface Receipt {
  id: string;          // unique id generated on the device
  merchant: string;    // shop name parsed from the receipt header
  purchasedAt: number; // epoch millis of the receipt date
  total: number;       // parsed grand total (LKR)
  imageUri?: string;   // local path to the captured image
  rawText: string;     // full OCR text (kept so we can re-parse / debug)
  createdAt: number;   // when the record was created on-device
  synced: boolean;     // false until the row is pushed to Firestore
}

// One line item within a receipt.
export interface ReceiptItem {
  id: string;
  receiptId: string;   // FK -> Receipt.id
  name: string;        // parsed item name
  amount: number;      // parsed price (LKR)
  categoryId: number;  // FK -> Category.id
}
