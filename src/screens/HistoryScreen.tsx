import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import GradientBackground from '../components/ui/GradientBackground';
import GlassCard from '../components/ui/GlassCard';
import { getReceipts, ReceiptSummary } from '../db/repository';
import { syncUp } from '../services/sync';
import { isFirebaseConfigured } from '../services/firebase';
import { colors } from '../theme/theme';

export default function HistoryScreen() {
  const [receipts, setReceipts] = useState<ReceiptSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReceipts(await getReceipts());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  async function doSync() {
    setSyncing(true);
    try {
      const res = await syncUp();
      if (res.skipped) Alert.alert('Firebase not set up', 'Add your Firebase config to enable cloud sync.');
      else
        Alert.alert(
          'Sync complete',
          `Uploaded ${res.pushed} receipt(s)` + (res.failed ? `, ${res.failed} still pending.` : '.')
        );
      await load();
    } finally {
      setSyncing(false);
    }
  }

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
            // offline
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
    <GradientBackground>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>History</Text>
              <Text style={styles.sub}>
                {receipts.length === 0
                  ? 'No receipts yet'
                  : unsynced === 0
                  ? 'All receipts synced ✓'
                  : `${unsynced} pending upload`}
              </Text>
            </View>
            <Pressable onPress={doSync} disabled={syncing} style={styles.syncBtn}>
              <Ionicons name="cloud-upload-outline" size={15} color="#fff" />
              <Text style={styles.syncText}>{syncing ? 'Syncing…' : 'Sync'}</Text>
            </Pressable>
          </View>

          {receipts.length === 0 ? (
            <GlassCard style={{ marginTop: 16 }}>
              <View style={styles.empty}>
                <Ionicons name="receipt-outline" size={30} color={colors.accent} />
                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                <Text style={styles.emptySub}>Scanned receipts will appear here.</Text>
              </View>
            </GlassCard>
          ) : (
            receipts.map((item) => (
              <GlassCard key={item.id} style={{ marginTop: 12 }} padded={false}>
                <View style={styles.card}>
                  <View style={styles.icon}>
                    <Ionicons name="receipt-outline" size={18} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shop} numberOfLines={1}>{item.merchant}</Text>
                    <Text style={styles.meta}>
                      {new Date(item.purchasedAt).toLocaleDateString()} · {item.itemCount} item(s)
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.total}>Rs {item.total.toFixed(0)}</Text>
                    <View style={[styles.badge, item.synced ? styles.badgeOk : styles.badgePend]}>
                      <Ionicons
                        name={item.synced ? 'checkmark-circle' : 'time-outline'}
                        size={11}
                        color={item.synced ? colors.success : '#B26A00'}
                      />
                      <Text style={[styles.badgeText, { color: item.synced ? colors.success : '#B26A00' }]}>
                        {item.synced ? 'Synced' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                </View>
              </GlassCard>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 130 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 13, color: colors.inkMuted, marginTop: 2 },
  syncBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.purple,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
  },
  syncText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  card: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  icon: {
    width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(163,122,180,0.16)', marginRight: 12,
  },
  shop: { fontSize: 15, fontWeight: '700', color: colors.ink },
  meta: { color: colors.inkMuted, fontSize: 12, marginTop: 2 },
  total: { fontSize: 16, fontWeight: '800', color: colors.success },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  badgeOk: { backgroundColor: '#E6F4EA' },
  badgePend: { backgroundColor: '#FFF4E5' },
  badgeText: { fontSize: 10, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 26, gap: 6 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.ink, marginTop: 4 },
  emptySub: { color: colors.inkMuted, textAlign: 'center', fontSize: 13 },
});
