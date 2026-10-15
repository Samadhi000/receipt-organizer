import { ComponentProps } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import { colors } from '../../theme/theme';

// A small reusable stat tile (icon + value + label) on a frosted card.
export default function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <GlassCard style={{ flex: 1 }} padded={false} strong>
      <View style={styles.inner}>
        <Ionicons name={icon} size={17} color={colors.accent} />
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  inner: { padding: 12, gap: 2 },
  value: { fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: 6 },
  label: { fontSize: 11, color: colors.inkMuted },
});
