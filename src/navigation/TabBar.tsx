import { ComponentProps } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadowStrong } from '../theme/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
const ICONS: Record<string, [IconName, IconName]> = {
  Home: ['home', 'home-outline'],
  History: ['time', 'time-outline'],
  Settings: ['settings', 'settings-outline'],
  Profile: ['person', 'person-outline'],
};

// Custom glass tab bar with a raised gradient "Upload" button in the centre.
export default function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 12);

  const go = (route: any, focused: boolean) => () => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
  };

  return (
    <View style={[styles.wrap, { height: 64 + bottomPad }]} pointerEvents="box-none">
      <View style={[styles.bar, { paddingBottom: bottomPad, backgroundColor: 'rgba(255,255,255,0.82)' }]}>
        <View style={styles.row}>
          {state.routes.map((route: any, index: number) => {
            const focused = state.index === index;
            if (route.name === 'Upload') return <View key={route.key} style={styles.item} />;
            const [on, off] = ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
            return (
              <Pressable key={route.key} style={styles.item} onPress={go(route, focused)} hitSlop={6}>
                <Ionicons name={focused ? on : off} size={22} color={focused ? colors.accent : colors.inkMuted} />
                <Text style={[styles.label, { color: focused ? colors.accent : colors.inkMuted }]}>{route.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Raised centre Upload FAB */}
      <View style={[styles.fabHolder, { bottom: bottomPad + 16 }]} pointerEvents="box-none">
        <Pressable onPress={() => navigation.navigate('Upload')} style={styles.fabPress}>
          <LinearGradient colors={colors.fab} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
            <Ionicons name="cloud-upload" size={26} color="#fff" />
          </LinearGradient>
          <Text style={styles.fabLabel}>Upload</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, top: 0,
    borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden',
    borderTopWidth: 1, borderColor: colors.glassBorder,
  },
  row: { flexDirection: 'row', alignItems: 'center', height: 64 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontSize: 11, fontWeight: '600' },
  fabHolder: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  fabPress: { alignItems: 'center' },
  fab: {
    width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.92)', ...shadowStrong,
  },
  fabLabel: { fontSize: 11, fontWeight: '700', color: colors.accent, marginTop: 3 },
});
