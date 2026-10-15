import { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { recognizeReceipt } from '../services/ocr';
import { enhanceForOcr } from '../services/enhance';
import { parseReceipt, ParsedReceipt } from '../services/parser';
import { saveReceipt } from '../db/repository';
import ReceiptReview, { ReviewItem } from '../components/ReceiptReview';
import GradientBackground from '../components/ui/GradientBackground';
import GlassCard from '../components/ui/GlassCard';
import { colors, shadow } from '../theme/theme';

export default function ScanScreen() {
  const navigation = useNavigation<any>();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleImage(uri: string, width?: number) {
    setImageUri(uri);
    setParsed(null);
    setRawText('');
    setBusy(true);
    try {
      const enhanced = await enhanceForOcr(uri, width);
      const ocr = await recognizeReceipt(enhanced);
      setRawText(ocr.text);
      setParsed(parseReceipt(ocr.lines));
    } catch (e) {
      Alert.alert('Scan failed', String(e));
    } finally {
      setBusy(false);
    }
  }

  async function scanWithCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera permission needed', 'Please allow camera access to scan receipts.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!res.canceled) handleImage(res.assets[0].uri, res.assets[0].width);
  }

  async function pickFromLibrary() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!res.canceled) handleImage(res.assets[0].uri, res.assets[0].width);
  }

  async function handleSaveEdited(data: {
    merchant: string;
    date: number | null;
    items: ReviewItem[];
    total: number;
  }) {
    if (!imageUri) return;
    setSaving(true);
    try {
      const receipt: ParsedReceipt = {
        merchant: data.merchant,
        date: data.date,
        items: data.items,
        total: data.total,
        quality: 'ok',
        priceCount: parsed?.priceCount ?? data.items.length,
      };
      await saveReceipt(receipt, imageUri, rawText);
      Alert.alert('Saved ✓', 'Receipt saved to your device.', [
        { text: 'View history', onPress: () => navigation.navigate('History') },
        {
          text: 'Scan another',
          onPress: () => {
            setParsed(null);
            setImageUri(null);
            setRawText('');
          },
        },
      ]);
    } catch (e) {
      Alert.alert('Save failed', String(e));
    } finally {
      setSaving(false);
    }
  }

  const poor = parsed?.quality === 'poor';

  return (
    <GradientBackground>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Upload a bill</Text>
          <Text style={styles.sub}>Scan or pick a receipt — we’ll read it on-device.</Text>

          <View style={styles.actions}>
            <Pressable style={styles.action} onPress={scanWithCamera}>
              <LinearGradient colors={colors.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionGrad}>
                <Ionicons name="camera" size={26} color="#fff" />
                <Text style={styles.actionText}>Camera</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={styles.action} onPress={pickFromLibrary}>
              <GlassCard strong padded={false} style={{ flex: 1 }}>
                <View style={styles.actionGlass}>
                  <Ionicons name="images" size={26} color={colors.accent} />
                  <Text style={[styles.actionText, { color: colors.accent }]}>Gallery</Text>
                </View>
              </GlassCard>
            </Pressable>
          </View>

          {imageUri && <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />}

          {busy && (
            <View style={styles.busy}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.busyText}>Reading receipt…</Text>
            </View>
          )}

          {poor && (
            <GlassCard style={{ marginTop: 16 }}>
              <View style={styles.warn}>
                <Ionicons name="warning-outline" size={20} color="#B26A00" />
                <Text style={styles.warnText}>
                  This photo is hard to read — check every line, fix any wrong name or price, and add
                  anything missing before saving.
                </Text>
              </View>
            </GlassCard>
          )}

          {parsed && (
            <ReceiptReview
              merchant={parsed.merchant}
              date={parsed.date}
              items={parsed.items}
              total={parsed.total}
              saving={saving}
              onSave={handleSaveEdited}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 130 },
  title: { fontSize: 24, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 13, color: colors.inkMuted, marginTop: 2, marginBottom: 16 },

  actions: { flexDirection: 'row', gap: 12 },
  action: { flex: 1, ...shadow },
  actionGrad: { flex: 1, height: 92, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionGlass: { height: 92, alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  preview: { width: '100%', height: 230, marginTop: 16, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.4)' },

  busy: { alignItems: 'center', marginTop: 28, gap: 10 },
  busyText: { color: colors.accent, fontWeight: '600' },

  warn: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  warnText: { flex: 1, color: '#7A4E00', lineHeight: 20, fontSize: 13 },
});
