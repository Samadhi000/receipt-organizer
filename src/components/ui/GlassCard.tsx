import { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../../theme/theme';

// Reusable "liquid glass" card: a translucent surface with a diagonal specular
// sheen and a bright top edge, so it reads as glossy glass over the gradient.
// (Real Android backdrop blur needs a captured blurTarget in SDK 57; this
// layered-translucency approach gives the liquid-glass look reliably.)
export default function GlassCard({
  children,
  style,
  strong = false,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  strong?: boolean;
  padded?: boolean;
}) {
  return (
    <View style={[styles.shadow, style]}>
      <View style={[styles.clip, { backgroundColor: strong ? colors.glassStrong : colors.glass }]}>
        {/* Specular sheen — bright top-left fading across the surface */}
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.24)']}
          locations={[0, 0.55, 1]}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Glossy top rim */}
        <View pointerEvents="none" style={styles.topEdge} />
        <View style={padded ? styles.pad : undefined}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // iOS-only soft shadow (no Android elevation → avoids the translucent-view artifact).
  shadow: {
    borderRadius: radius.xl,
    shadowColor: '#5B4A6B',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  clip: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
  },
  topEdge: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, backgroundColor: 'rgba(255,255,255,0.85)' },
  pad: { padding: 16 },
});
