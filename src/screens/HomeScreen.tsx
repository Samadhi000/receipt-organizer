import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import GradientBackground from '../components/ui/GradientBackground';
import GlassCard from '../components/ui/GlassCard';
import StatTile from '../components/ui/StatTile';
import DonutChart from '../components/DonutChart';
import {
  getStats,
  getCategoryTotals,
  getShopTotals,
  getReceipts,
  Stats,
  CategoryTotal,
  ShopTotal,
  ReceiptSummary,
} from '../db/repository';
import { colors, shadowStrong } from '../theme/theme';

function daypart() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [cats, setCats] = useState<CategoryTotal[]>([]);
  const [shops, setShops] = useState<ShopTotal[]>([]);
  const [recent, setRecent] = useState<ReceiptSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await getStats());
      setCats(await getCategoryTotals());
      setShops(await getShopTotals());
      setRecent((await getReceipts()).slice(0, 4));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = cats.reduce((s, c) => s + c.total, 0);
  const donutData = cats.map((c, i) => ({
    label: c.name,
    value: c.total,
    color: colors.chart[i % colors.chart.length],
  }));
  const maxShop = Math.max(1, ...shops.map((s) => s.total));
  const topCat = cats[0];
  const empty = !stats || stats.receiptCount === 0;

  return (
    <GradientBackground>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Good {daypart()} 👋</Text>
              <Text style={styles.subtitle}>Here’s your spending overview</Text>
            </View>
            <Pressable onPress={() => nav.navigate('Profile')} style={styles.avatar}>
              <Ionicons name="person" size={20} color="#fff" />
            </Pressable>
          </View>

          {/* Hero total */}
          <LinearGradient colors={colors.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <Text style={styles.heroLabel}>Total spent</Text>
            <Text style={styles.heroValue}>Rs {(stats?.totalSpend ?? 0).toFixed(2)}</Text>
            <View style={styles.heroRow}>
              <View style={styles.heroPill}>
                <Ionicons name="receipt-outline" size={13} color="#fff" />
                <Text style={styles.heroPillText}>{stats?.receiptCount ?? 0} receipts</Text>
              </View>
              {topCat && (
                <View style={styles.heroPill}>
                  <Ionicons name="pricetag-outline" size={13} color="#fff" />
                  <Text style={styles.heroPillText}>Top: {topCat.name}</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          <View style={styles.tiles}>
            <StatTile label="Receipts" value={stats?.receiptCount ?? 0} icon="receipt-outline" />
            <StatTile label="Items" value={stats?.itemCount ?? 0} icon="pricetag-outline" />
            <StatTile label="Avg / bill" value={`Rs ${Math.round(stats?.avgReceipt ?? 0)}`} icon="trending-up-outline" />
          </View>

          {empty ? (
            <GlassCard style={styles.block}>
              <View style={styles.emptyBox}>
                <Ionicons name="sparkles-outline" size={30} color={colors.accent} />
                <Text style={styles.emptyTitle}>No spending yet</Text>
                <Text style={styles.emptySub}>Tap the Upload button below to scan your first receipt.</Text>
              </View>
            </GlassCard>
          ) : (
            <>
              <GlassCard style={styles.block}>
                <CardHead title="By category" />
                <View style={{ alignItems: 'center', marginVertical: 6 }}>
                  <DonutChart data={donutData} centerLabel={`Rs ${Math.round(total)}`} />
                </View>
                {cats.slice(0, 5).map((c, i) => (
                  <View key={c.name} style={styles.legendRow}>
                    <View style={[styles.dot, { backgroundColor: colors.chart[i % colors.chart.length] }]} />
                    <Text style={styles.legendName}>{c.name}</Text>
                    <Text style={styles.legendVal}>
                      Rs {c.total.toFixed(0)} · {Math.round((c.total / total) * 100)}%
                    </Text>
                  </View>
                ))}
              </GlassCard>

              <GlassCard style={styles.block}>
                <CardHead title="Top shops" />
                {shops.slice(0, 4).map((s, i) => (
                  <View key={s.merchant} style={{ marginBottom: 12 }}>
                    <View style={styles.barLabelRow}>
                      <Text style={styles.barLabel} numberOfLines={1}>{s.merchant}</Text>
                      <Text style={styles.barVal}>Rs {s.total.toFixed(0)}</Text>
                    </View>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.fill,
                          { width: `${(s.total / maxShop) * 100}%`, backgroundColor: colors.chart[i % colors.chart.length] },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </GlassCard>

              <GlassCard style={styles.block}>
                <CardHead title="Recent" actionLabel="See all" onAction={() => nav.navigate('History')} />
                {recent.map((r) => (
                  <View key={r.id} style={styles.recentRow}>
                    <View style={styles.recentIcon}>
                      <Ionicons name="receipt-outline" size={16} color={colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recentShop} numberOfLines={1}>{r.merchant}</Text>
                      <Text style={styles.recentMeta}>
                        {new Date(r.purchasedAt).toLocaleDateString()} · {r.itemCount} items
                      </Text>
                    </View>
                    <Text style={styles.recentAmt}>Rs {r.total.toFixed(0)}</Text>
                  </View>
                ))}
              </GlassCard>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function CardHead({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.cardHead}>
      <Text style={styles.cardTitle}>{title}</Text>
      {actionLabel && (
        <Pressable onPress={onAction}>
          <Text style={styles.cardAction}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 130 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  greeting: { fontSize: 24, fontWeight: '800', color: colors.ink },
  subtitle: { fontSize: 13, color: colors.inkMuted, marginTop: 2 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.purple, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)',
  },

  hero: { borderRadius: 24, padding: 20, ...shadowStrong },
  heroLabel: { color: colors.onHeroDim, fontSize: 13, fontWeight: '600' },
  heroValue: { color: '#fff', fontSize: 34, fontWeight: '900', marginTop: 4 },
  heroRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999,
  },
  heroPillText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  tiles: { flexDirection: 'row', gap: 10, marginTop: 14 },
  block: { marginTop: 14 },

  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.ink },
  cardAction: { fontSize: 13, fontWeight: '700', color: colors.accent },

  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  dot: { width: 11, height: 11, borderRadius: 6, marginRight: 8 },
  legendName: { flex: 1, color: colors.ink, fontSize: 14 },
  legendVal: { color: colors.inkMuted, fontWeight: '600', fontSize: 12 },

  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  barLabel: { color: colors.ink, fontWeight: '600', flex: 1, paddingRight: 8 },
  barVal: { color: colors.accent, fontWeight: '800', fontSize: 13 },
  track: { height: 10, backgroundColor: 'rgba(120,110,140,0.14)', borderRadius: 6, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 6 },

  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  recentIcon: {
    width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(163,122,180,0.16)', marginRight: 10,
  },
  recentShop: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  recentMeta: { color: colors.inkMuted, fontSize: 12, marginTop: 1 },
  recentAmt: { color: colors.success, fontWeight: '800' },

  emptyBox: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginTop: 4 },
  emptySub: { color: colors.inkMuted, textAlign: 'center', fontSize: 13 },
});
