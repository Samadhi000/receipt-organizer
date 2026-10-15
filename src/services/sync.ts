import { doc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { currentUser } from './auth';
import { getDb } from '../db/database';

export interface SyncResult {
  pushed: number;
  failed: number;
  skipped?: boolean; // true when Firebase isn't configured yet
}

// How many local receipts still need uploading.
export async function countUnsynced(): Promise<number> {
  const sqlite = await getDb();
  const row = await sqlite.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM receipts WHERE synced = 0'
  );
  return row?.n ?? 0;
}

// One-way sync: push every receipt not yet uploaded to Firestore, then mark it
// synced locally. The device DB stays the source of truth; if we're offline the
// writes fail and the rows simply remain pending for the next attempt.
export async function syncUp(): Promise<SyncResult> {
  if (!isFirebaseConfigured()) return { pushed: 0, failed: 0, skipped: true };

  const sqlite = await getDb();
  const receipts = await sqlite.getAllAsync<any>('SELECT * FROM receipts WHERE synced = 0');

  // Scope each user's receipts to their own subtree when signed in.
  const uid = currentUser()?.uid;

  let pushed = 0;
  let failed = 0;

  for (const r of receipts) {
    try {
      const items = await sqlite.getAllAsync<any>(
        'SELECT name, amount, categoryId FROM items WHERE receiptId = ?',
        r.id
      );

      // Store each receipt as one Firestore document, items embedded.
      const ref = uid ? doc(db, 'users', uid, 'receipts', r.id) : doc(db, 'receipts', r.id);
      await setDoc(ref, {
        merchant: r.merchant,
        purchasedAt: r.purchasedAt,
        total: r.total,
        createdAt: r.createdAt,
        items,
      });

      await sqlite.runAsync('UPDATE receipts SET synced = 1 WHERE id = ?', r.id);
      pushed++;
    } catch {
      failed++; // offline or a rules error — leave it pending
    }
  }

  return { pushed, failed };
}
