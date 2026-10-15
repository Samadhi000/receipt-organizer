// Lightweight unique id — no external dependency required.
// Good enough for local record keys and Firestore document ids.
export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
