import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getReceipts, ReceiptSummary } from '../db/repository';
import { syncUp } from '../services/sync';
import { isFirebaseConfigured } from '../services/firebase';

export default function ReceiptsScreen() {
  const [receipts, setReceipts] = useState<ReceiptSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReceipts(await getReceipts());
    } catch {
      // ignore for now
    } finally {
      setLoading(false);
    }
  }, []);

  // Manual sync with feedback.
  async function doSync() {
    setSyncing(true);
    try {
      const res = await syncUp();
      if (res.skipped) {
        Alert.alert('Firebase not set up', 'Add your Firebase config to enable cloud sync.');
      } else {
        Alert.alert(
          'Sync complete',
          `Uploaded ${res.pushed} receipt(s)` +
            (res.failed ? `, ${res.failed} still pending (offline?)` : '') +
            '.'
        );
      }
      await load();
    } finally {
      setSyncing(false);
    }
  }

  // On focus: reload, then best-effort auto-sync (silent when offline).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await load();
        if (isFirebaseConfigured()) {
          try {
            await syncUp();
            if (active) await load();
          } catch {
            // offline — leave rows pending
          }
        }
      })();
      return () => {
        active = false;
      };
    }, [load])
  );

  const unsynced = receipts.filter((r) => !r.synced).length;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.syncBar}>
        <Text style={styles.syncStatus}>
          {receipts.length === 0
            ? 'No receipts'
            : unsynced === 0
            ? 'All receipts synced ✓'
            : `${unsynced} pending upload`}
        </Text>
        <Pressable
          style={[styles.syncBtn, syncing && { opacity: 0.6 }]}
          onPress={doSync}
          disabled={syncing}
        >
          <Text style={styles.syncBtnText}>{syncing ? 'Syncing…' : '☁️ Sync now'}</Text>
        </Pressable>
      </View>

      <FlatList
        data={receipts}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🧾</Text>
            <Text style={styles.emptyTitle}>No receipts yet</Text>
            <Text style={styles.emptySub}>Scan a receipt and tap “Save” to see it here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.shop}>{item.merchant}</Text>
              <Text style={styles.meta}>
                {new Date(item.purchasedAt).toLocaleDateString()} · {item.itemCount} item(s)
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.total}>Rs {item.total.toFixed(2)}</Text>
              <Text style={[styles.badge, item.synced ? styles.badgeSynced : styles.badgePending]}>
                {item.synced ? '✓ Synced' : '↑ Pending'}
              </Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  syncBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#E8F0FE',
    borderBottomWidth: 1,
    borderBottomColor: '#D0DEF7',
  },
  syncStatus: { color: '#333', fontWeight: '600' },
  syncBtn: { backgroundColor: '#2196F3', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  syncBtnText: { color: '#fff', fontWeight: '700' },

  list: { padding: 16, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  shop: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  meta: { color: '#666', marginTop: 2, fontSize: 13 },
  total: { fontSize: 16, fontWeight: '800', color: '#2E7D32' },
  badge: { marginTop: 4, fontSize: 11, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  badgeSynced: { color: '#2E7D32', backgroundColor: '#E6F4EA' },
  badgePending: { color: '#B26A00', backgroundColor: '#FFF4E5' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { color: '#666', marginTop: 6, textAlign: 'center' },
});
