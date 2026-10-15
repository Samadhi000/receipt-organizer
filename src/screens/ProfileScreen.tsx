import { ComponentProps, useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import GradientBackground from '../components/ui/GradientBackground';
import GlassCard from '../components/ui/GlassCard';
import { getStats, getCategoryTotals, Stats } from '../db/repository';
import { logOut, currentUser } from '../services/auth';
import { colors, shadowStrong } from '../theme/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function ProfileScreen() {
  const nav = useNavigation<any>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [topCat, setTopCat] = useState<string>('—');

  const load = useCallback(async () => {
    try {
      setStats(await getStats());
      const cats = await getCategoryTotals();
      setTopCat(cats[0]?.name ?? '—');
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const email = currentUser()?.email ?? null;
  function handleSignOut() {
    Alert.alert('Sign out?', 'You can sign back in anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { logOut(); } },
    ]);
  }

  return (
    <GradientBackground>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Profile</Text>

          {/* Hero */}
          <LinearGradient colors={colors.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={34} color="#fff" />
            </View>
            <Text style={styles.name}>{email ? email.split('@')[0] : 'You'}</Text>
            <Text style={styles.role}>{email ?? 'Receipt Organizer'}</Text>
          </LinearGradient>

          {/* Spending summary */}
          <View style={styles.tiles}>
            <Summary value={`Rs ${Math.round(stats?.totalSpend ?? 0)}`} label="Total spent" />
            <Summary value={`${stats?.receiptCount ?? 0}`} label="Receipts" />
            <Summary value={topCat} label="Top category" />
          </View>

          {/* Menu */}
          <GlassCard padded={false} style={{ marginTop: 16 }}>
            <Menu icon="time-outline" label="Purchase history" onPress={() => nav.navigate('History')} />
            <Menu icon="cloud-upload-outline" label="Upload a bill" onPress={() => nav.navigate('Upload')} />
            <Menu icon="settings-outline" label="Settings" onPress={() => nav.navigate('Settings')} last={!email} />
            {email ? <Menu icon="log-out-outline" label="Sign out" onPress={handleSignOut} last /> : null}
          </GlassCard>

          <Text style={styles.footer}>M.Sc. IT · SE5070 Enterprise Mobility</Text>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function Summary({ value, label }: { value: string; label: string }) {
  return (
    <GlassCard style={{ flex: 1 }} padded={false} strong>
      <View style={styles.sumInner}>
        <Text style={styles.sumValue} numberOfLines={1}>{value}</Text>
        <Text style={styles.sumLabel}>{label}</Text>
      </View>
    </GlassCard>
  );
}

function Menu({ icon, label, onPress, last }: { icon: IconName; label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.menu, !last && styles.menuBorder]}>
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={17} color={colors.accent} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 130 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 12 },

  hero: { borderRadius: 24, padding: 22, alignItems: 'center', ...shadowStrong },
  avatar: {
    width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 3, borderColor: 'rgba(255,255,255,0.6)',
  },
  name: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 12 },
  role: { color: colors.onHeroDim, fontSize: 13, marginTop: 2 },

  tiles: { flexDirection: 'row', gap: 10, marginTop: 14 },
  sumInner: { padding: 12, alignItems: 'center', gap: 2 },
  sumValue: { fontSize: 16, fontWeight: '800', color: colors.ink },
  sumLabel: { fontSize: 11, color: colors.inkMuted, textAlign: 'center' },

  menu: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  menuIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(163,122,180,0.14)', marginRight: 12 },
  menuLabel: { flex: 1, fontSize: 15, color: colors.ink, fontWeight: '600' },

  footer: { color: colors.inkMuted, fontSize: 12, textAlign: 'center', marginTop: 22 },
});
