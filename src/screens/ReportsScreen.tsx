import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getCategoryTotals,
  getShopTotals,
  CategoryTotal,
  ShopTotal,
} from '../db/repository';
import DonutChart from '../components/DonutChart';

type Range = 'month' | 'all';

function startOfMonth(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}

export default function ReportsScreen() {
  const [range, setRange] = useState<Range>('month');
  const [cats, setCats] = useState<CategoryTotal[]>([]);
  const [shops, setShops] = useState<ShopTotal[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (r: Range) => {
    setLoading(true);
    const since = r === 'month' ? startOfMonth() : undefined;
    try {
      setCats(await getCategoryTotals(since));
      setShops(await getShopTotals(since));
    } catch {
      // ignore for now
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(range);
    }, [load, range])
  );

  const total = cats.reduce((s, c) => s + c.total, 0);
  const donutData = cats.map((c) => ({ label: c.name, value: c.total, color: c.color }));
  const maxShop = Math.max(1, ...shops.map((s) => s.total));

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(range)} />}
    >
      <View style={styles.toggle}>
        {(['month', 'all'] as Range[]).map((r) => (
          <Pressable
            key={r}
            onPress={() => setRange(r)}
            style={[styles.tab, range === r && styles.tabActive]}
          >
            <Text style={[styles.tabText, range === r && styles.tabTextActive]}>
              {r === 'month' ? 'This Month' : 'All Time'}
            </Text>
          </Pressable>
        ))}
      </View>

      {total === 0 ? (
        <Text style={styles.empty}>No spending in this period. Scan and save a receipt first.</Text>
      ) : (
        <>
          <Text style={styles.headline}>Rs {total.toFixed(2)}</Text>
          <Text style={styles.sub}>total spending</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>By category</Text>
            <View style={{ alignItems: 'center', marginVertical: 8 }}>
              <DonutChart data={donutData} centerLabel={`Rs ${Math.round(total)}`} />
            </View>
            {cats.map((c) => (
              <View key={c.name} style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: c.color }]} />
                <Text style={styles.legendName}>{c.name}</Text>
                <Text style={styles.legendVal}>
                  Rs {c.total.toFixed(2)} · {Math.round((c.total / total) * 100)}%
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>By shop</Text>
            {shops.map((s) => (
              <View key={s.merchant} style={{ marginBottom: 12 }}>
                <View style={styles.barLabelRow}>
                  <Text style={styles.barLabel}>{s.merchant}</Text>
                  <Text style={styles.barVal}>Rs {s.total.toFixed(2)}</Text>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(s.total / maxShop) * 100}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 48 },
  toggle: { flexDirection: 'row', backgroundColor: '#ECECEC', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { color: '#666', fontWeight: '600' },
  tabTextActive: { color: '#1A1A1A', fontWeight: '800' },

  headline: { fontSize: 30, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' },
  sub: { color: '#888', textAlign: 'center', marginBottom: 8 },
  empty: { color: '#888', textAlign: 'center', marginTop: 60, fontStyle: 'italic' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8, color: '#1A1A1A' },

  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  legendName: { flex: 1, color: '#333' },
  legendVal: { color: '#333', fontWeight: '600', fontSize: 13 },

  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { color: '#333', fontWeight: '600' },
  barVal: { color: '#2E7D32', fontWeight: '700' },
  barTrack: { height: 12, backgroundColor: '#EEE', borderRadius: 6, overflow: 'hidden' },
  barFill: { height: 12, backgroundColor: '#2196F3', borderRadius: 6 },
});
