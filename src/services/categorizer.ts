import { Category } from '../types/models';

// ---------------------------------------------------------------------------
// Item categorizer
// ---------------------------------------------------------------------------
// Each category owns a list of keywords. We assign an item to a category by:
//   1. exact substring match  ("milk" is inside "milk powder 400g")  -> strong
//   2. fuzzy word match        (edit distance <= threshold)          -> weak
// The fuzzy step is what survives OCR mistakes such as "0il" -> "oil".
// If nothing matches we fall back to the "Other" category.
// ---------------------------------------------------------------------------

// Classic Levenshtein edit distance: the minimum number of single-character
// insertions, deletions or substitutions to turn `a` into `b`.
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}

// Return the best-matching category id for an item name.
export function pickCategory(itemName: string, categories: Category[]): number {
  const name = itemName.toLowerCase();
  const words = name.split(/[^a-z0-9]+/).filter(Boolean);

  const otherId =
    categories.find((c) => c.name === 'Other')?.id ??
    categories[categories.length - 1]?.id ??
    0;

  let best: { id: number; score: number } | null = null;

  for (const cat of categories) {
    let score = 0;
    for (const raw of cat.keywords) {
      const k = raw.trim().toLowerCase();
      if (!k) continue;

      if (name.includes(k)) {
        score += 2; // exact substring — strong signal
        continue;
      }
      // Allow 1 edit for short keywords, 2 for longer ones.
      const threshold = k.length <= 4 ? 1 : 2;
      if (words.some((w) => levenshtein(w, k) <= threshold)) {
        score += 1; // fuzzy match — weaker signal
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { id: cat.id, score };
    }
  }

  return best ? best.id : otherId;
}
