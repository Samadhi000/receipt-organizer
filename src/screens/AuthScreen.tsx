import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import GradientBackground from '../components/ui/GradientBackground';
import GlassCard from '../components/ui/GlassCard';
import { signIn, signUp, authErrorMessage } from '../services/auth';
import { colors, type, shadowStrong } from '../theme/theme';

export default function AuthScreen({ onSkip }: { onSkip: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';

  async function submit() {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      if (isSignup) await signUp(email, password);
      else await signIn(email, password);
      // The auth-state listener in App swaps to the app automatically.
    } catch (e: any) {
      setError(authErrorMessage(e?.code ?? ''));
    } finally {
      setBusy(false);
    }
  }

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.center}
        >
          <LinearGradient colors={colors.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
            <Ionicons name="receipt" size={34} color="#fff" />
          </LinearGradient>
          <Text style={styles.appName}>Receipt Organizer</Text>
          <Text style={styles.tagline}>Scan, track & understand your spending</Text>

          <GlassCard style={styles.card} strong>
            <Text style={styles.cardTitle}>{isSignup ? 'Create your account' : 'Welcome back'}</Text>

            <View style={styles.field}>
              <Ionicons name="mail-outline" size={18} color={colors.inkMuted} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.inkMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <View style={styles.field}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.inkMuted} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.inkMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable onPress={submit} disabled={busy} style={[styles.submitWrap, busy && { opacity: 0.7 }]}>
              <LinearGradient colors={colors.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submit}>
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>{isSignup ? 'Create account' : 'Sign in'}</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => {
                setMode(isSignup ? 'signin' : 'signup');
                setError('');
              }}
            >
              <Text style={styles.toggle}>
                {isSignup ? 'Already have an account?  Sign in' : 'New here?  Create an account'}
              </Text>
            </Pressable>
          </GlassCard>

          <Pressable onPress={onSkip} style={styles.skip}>
            <Text style={styles.skipText}>Continue without an account</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: 22 },
  logo: {
    width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', ...shadowStrong,
  },
  appName: { fontFamily: type.extrabold, fontSize: 24, color: colors.ink, textAlign: 'center', marginTop: 14 },
  tagline: { fontFamily: type.regular, fontSize: 13, color: colors.inkMuted, textAlign: 'center', marginTop: 4, marginBottom: 22 },

  card: {},
  cardTitle: { fontFamily: type.bold, fontSize: 18, color: colors.ink, marginBottom: 14 },

  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 14, paddingHorizontal: 12, height: 50, marginBottom: 12,
  },
  input: { flex: 1, fontFamily: type.medium, fontSize: 15, color: colors.ink },

  error: { fontFamily: type.medium, color: colors.danger, fontSize: 13, marginBottom: 10 },

  submitWrap: { marginTop: 4, borderRadius: 14, overflow: 'hidden' },
  submit: { height: 52, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontFamily: type.bold, color: '#fff', fontSize: 16 },

  toggle: { fontFamily: type.semibold, color: colors.accent, fontSize: 13, textAlign: 'center', marginTop: 16 },

  skip: { marginTop: 22, alignSelf: 'center' },
  skipText: { fontFamily: type.medium, color: colors.inkMuted, fontSize: 13, textDecorationLine: 'underline' },
});
