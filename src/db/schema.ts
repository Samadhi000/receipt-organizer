// SQL schema for the local (offline-first) SQLite database.
// The device DB is the single source of truth; rows sync up to Firestore later.

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL,
  keywords TEXT NOT NULL            -- comma separated keywords
);

CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  merchant TEXT NOT NULL,
  purchasedAt INTEGER NOT NULL,
  total REAL NOT NULL,
  imageUri TEXT,
  rawText TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0 -- 0 = needs sync, 1 = synced
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  receiptId TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  categoryId INTEGER NOT NULL,
  FOREIGN KEY (receiptId) REFERENCES receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (categoryId) REFERENCES categories(id)
);

CREATE INDEX IF NOT EXISTS idx_items_receipt ON items(receiptId);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(categoryId);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(purchasedAt);
`;

// Default categories seeded on first run. The keywords drive auto-categorization
// and are seeded with some Sri Lankan terms (dhal, kottu, pickme, dialog, ...).
export const DEFAULT_CATEGORIES: { name: string; color: string; keywords: string }[] = [
  { name: 'Groceries', color: '#4CAF50', keywords: 'milk,bread,rice,egg,sugar,flour,vegetable,fruit,dhal,coconut,keells,cargills,arpico,sathosa' },
  { name: 'Dining',    color: '#FF9800', keywords: 'restaurant,cafe,kottu,rice and curry,burger,pizza,coffee,tea,meal,bakery' },
  { name: 'Transport', color: '#2196F3', keywords: 'fuel,petrol,diesel,bus,train,taxi,uber,pickme,parking,ceypetco,ioc' },
  { name: 'Household', color: '#9C27B0', keywords: 'soap,detergent,tissue,cleaner,battery,bulb,hardware,gas' },
  { name: 'Health',    color: '#F44336', keywords: 'pharmacy,medicine,tablet,syrup,doctor,clinic,panadol,osudu' },
  { name: 'Utilities', color: '#607D8B', keywords: 'electricity,water,bill,recharge,internet,mobitel,dialog,slt,ceb' },
  { name: 'Other',     color: '#9E9E9E', keywords: '' },
];
