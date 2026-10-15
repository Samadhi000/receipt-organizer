import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

// ---------------------------------------------------------------------------
// DonutChart — a custom component built from scratch with react-native-svg.
//
// Each slice is one full circle drawn with a dash pattern: the visible dash
// length equals the slice's share of the circumference, and strokeDashoffset
// pushes it to start where the previous slice ended. The whole thing is rotated
// -90° so the first slice begins at the top (12 o'clock).
//
// Props:
//   data        - [{ label, value, color }]  the slices
//   size        - overall width/height in px (default 200)
//   strokeWidth - thickness of the ring (default 34)
//   centerLabel - optional text drawn in the middle
// ---------------------------------------------------------------------------
export interface Segment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: Segment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
}

export default function DonutChart({ data, size = 200, strokeWidth = 34, centerLabel }: Props) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0; // distance (in px along the ring) already consumed by earlier slices
  const slices = data.map((d, i) => {
    const dash = (d.value / total) * circumference;
    const el = (
      <Circle
        key={i}
        cx={cx}
        cy={cy}
        r={radius}
        stroke={d.color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeDashoffset={-offset}
        fill="none"
      />
    );
    offset += dash;
    return el;
  });

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={cx} originY={cy}>
          {/* Background track */}
          <Circle cx={cx} cy={cy} r={radius} stroke="#EEEEEE" strokeWidth={strokeWidth} fill="none" />
          {slices}
        </G>
      </Svg>
      {centerLabel ? (
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.centerText}>{centerLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  centerText: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
});
