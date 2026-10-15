import { ComponentProps, useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import GradientBackground from '../components/ui/GradientBackground';
import GlassCard from '../components/ui/GlassCard';
import { getCategories, getStats, clearAllReceipts } from '../db/repository';
import { syncUp } from '../services/sync';
import { isFirebaseConfigured } from '../services/firebase';
import { colors } from '../theme/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function Row({
  icon,
  label,
  value,
  onPress,
  danger,
  last,
}: {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.row, !last && styles.rowBorder]}>
      <View style={[styles.rowIcon, danger && { backgroundColor: 'rgba(198,75,110,0.14)' }]}>
        <Ionicons name={icon} size={17} color={danger ? colors.danger : colors.accent} />
      </View>
      <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {onPress && !value ? <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} /> : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const [catCount, setCatCount] = useState(0);
  const [receiptCount, setReceiptCount] = useState(0);

  const load = useCallback(async () => {
    try {
      setCatCount((await getCategories()).length);
      setReceiptCount((await getStats()).receiptCount);
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function syncNow() {
    const res = await syncUp();
    if (res.skipped) Alert.alert('Cloud sync', 'Firebase isn’t configured in this build.');
    else Alert.alert('Cloud sync', `Uploaded ${res.pushed} receipt(s).`);
    load();
  }

  function confirmClear() {
    Alert.alert('Clear all receipts?', 'This permanently deletes every saved receipt and item on this device. Categories are kept.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete all',
        style: 'destructive',
        onPress: async () => {
          await clearAllReceipts();
          await load();
          Alert.alert('Done', 'All receipts were deleted.');
        },
      },
    ]);
  }

  return (
    <GradientBackground>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Settings</Text>

          <Text style={styles.group}>Cloud</Text>
          <GlassCard padded={false}>
            <Row icon="cloud-outline" label="Cloud sync" value={isFirebaseConfigured() ? 'Connected' : 'Off'} />
            <Row icon="cloud-upload-outline" label="Sync now" onPress={syncNow} last />
          </GlassCard>

          <Text style={styles.group}>Data</Text>
          <GlassCard padded={false}>
            <Row icon="pricetags-outline" label="Categories" value={`${catCount}`} />
            <Row icon="cash-outline" label="Currency" value="LKR (Rs)" />
            <Row icon="receipt-outline" label="Saved receipts" value={`${receiptCount}`} />
            <Row icon="trash-outline" label="Clear all receipts" onPress={confirmClear} danger last />
          </GlassCard>

          <Text style={styles.group}>About</Text>
          <GlassCard padded={false}>
            <Row icon="phone-portrait-outline" label="App" value="Receipt Organizer" />
            <Row icon="school-outline" label="Module" value="SE5070" />
            <Row icon="information-circle-outline" label="Version" value="1.0.0" last />
          </GlassCard>

          <Text style={styles.footer}>Receipts are read on-device (offline) and synced to your cloud when online.</Text>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 130 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  group: { fontSize: 12, fontWeight: '700', color: colors.inkMuted, textTransform: 'uppercase', marginTop: 18, marginBottom: 8, marginLeft: 4, letterSpacing: 0.5 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  rowIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(163,122,180,0.14)', marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 15, color: colors.ink, fontWeight: '600' },
  rowValue: { fontSize: 14, color: colors.inkMuted, fontWeight: '600' },

  footer: { color: colors.inkMuted, fontSize: 12, textAlign: 'center', marginTop: 22, paddingHorizontal: 20, lineHeight: 18 },
});
