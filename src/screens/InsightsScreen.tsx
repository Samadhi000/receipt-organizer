import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getStats,
  getCategoryTotals,
  getShopTotals,
  getAnomalies,
  Stats,
  CategoryTotal,
  ShopTotal,
  AnomalyItem,
} from '../db/repository';

export default function InsightsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [cats, setCats] = useState<CategoryTotal[]>([]);
  const [shops, setShops] = useState<ShopTotal[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await getStats());
      setCats(await getCategoryTotals());
      setShops(await getShopTotals());
      setAnomalies(await getAnomalies());
    } catch {
      // ignore for now
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const topCategory = cats[0];
  const topShop = shops[0];
  const totalSpend = stats?.totalSpend ?? 0;

  if (!stats || stats.receiptCount === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>💡</Text>
        <Text style={styles.emptyTitle}>No insights yet</Text>
        <Text style={styles.emptySub}>Save a few receipts and your spending analysis appears here.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      {/* Stat tiles */}
      <View style={styles.tiles}>
        <View style={styles.tile}>
          <Text style={styles.tileValue}>Rs {stats.totalSpend.toFixed(0)}</Text>
          <Text style={styles.tileLabel}>total spent</Text>
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileValue}>{stats.receiptCount}</Text>
          <Text style={styles.tileLabel}>receipts</Text>
        </View>
      </View>
      <View style={styles.tiles}>
        <View style={styles.tile}>
          <Text style={styles.tileValue}>Rs {stats.avgReceipt.toFixed(0)}</Text>
          <Text style={styles.tileLabel}>avg / receipt</Text>
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileValue}>{stats.itemCount}</Text>
          <Text style={styles.tileLabel}>items</Text>
        </View>
      </View>

      {/* Spending style */}
      {topCategory && (
        <View style={[styles.card, styles.accent]}>
          <Text style={styles.cardTitle}>Your spending style</Text>
          <Text style={styles.styleText}>
            Most of your money goes on{' '}
            <Text style={styles.bold}>{topCategory.name}</Text> —{' '}
            {Math.round((topCategory.total / totalSpend) * 100)}% of spending
            {topShop ? (
              <Text>
                , and your top shop is <Text style={styles.bold}>{topShop.merchant}</Text>.
              </Text>
            ) : (
              <Text>.</Text>
            )}
          </Text>
        </View>
      )}

      {/* Top category / shop */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Highlights</Text>
        {topCategory && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>🏷️ Top category</Text>
            <Text style={styles.rowVal}>
              {topCategory.name} · Rs {topCategory.total.toFixed(2)}
            </Text>
          </View>
        )}
        {topShop && (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>🏬 Top shop</Text>
            <Text style={styles.rowVal}>
              {topShop.merchant} · Rs {topShop.total.toFixed(2)}
            </Text>
          </View>
        )}
      </View>

      {/* Unusual spending */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Unusual spending</Text>
        {anomalies.length === 0 ? (
          <Text style={styles.muted}>
            Nothing unusual — no item costs far above your typical spend.
          </Text>
        ) : (
          anomalies.map((a, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.rowLabel}>⚠️ {a.name}</Text>
              <Text style={[styles.rowVal, { color: '#C62828' }]}>Rs {a.amount.toFixed(2)}</Text>
            </View>
          ))
        )}
        <Text style={styles.footnote}>
          Flagged when an item costs more than 2 standard deviations above your average item price.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  tiles: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  tile: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  tileValue: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  tileLabel: { color: '#888', marginTop: 2, fontSize: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  accent: { backgroundColor: '#EEF6FF', borderColor: '#CFE3FA' },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10, color: '#1A1A1A' },
  styleText: { fontSize: 15, color: '#333', lineHeight: 22 },
  bold: { fontWeight: '800', color: '#1A1A1A' },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { color: '#444', flex: 1, paddingRight: 8 },
  rowVal: { color: '#1A1A1A', fontWeight: '700' },
  muted: { color: '#777', fontStyle: 'italic' },
  footnote: { color: '#999', fontSize: 11, marginTop: 10 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { color: '#666', marginTop: 6, textAlign: 'center' },
});
