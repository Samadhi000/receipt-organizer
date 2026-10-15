import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { validateReceipt, isNameSuspect } from '../services/validation';

// ---------------------------------------------------------------------------
// ReceiptReview — a custom editable component (the validation UI).
//
// Props:
//   merchant, date, items, total  — the parsed values to review
//   saving                        — disables the button while a save runs
//   onSave(data)                  — fired with the corrected receipt
//
// It keeps its own editable draft (names + prices as text), shows a live
// reconciliation banner (items sum vs total), lets the user edit any name,
// fix any price, delete a wrong line, add a missing one, and correct the total
// before saving.
// ---------------------------------------------------------------------------

export interface ReviewItem {
  name: string;
  price: number;
}

interface Props {
  merchant: string;
  date: number | null;
  items: ReviewItem[];
  total: number | null;
  saving?: boolean;
  onSave: (data: {
    merchant: string;
    date: number | null;
    items: ReviewItem[];
    total: number;
  }) => void;
}

interface DraftRow {
  name: string;
  price: string;
}

const onlyNumber = (s: string) => s.replace(/[^0-9.]/g, '');

export default function ReceiptReview({ merchant: m0, date, items, total, saving, onSave }: Props) {
  const [merchant, setMerchant] = useState(m0);
  const [rows, setRows] = useState<DraftRow[]>(
    items.map((i) => ({ name: i.name, price: i.price ? String(i.price) : '' }))
  );
  const [totalStr, setTotalStr] = useState(total != null ? String(total) : '');

  const numItems = rows.map((r) => ({ name: r.name.trim(), price: parseFloat(r.price) || 0 }));
  const totalNum = parseFloat(totalStr) || 0;
  const v = validateReceipt(numItems, totalNum);

  const updateName = (i: number, val: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, name: val } : r)));
  const updatePrice = (i: number, val: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, price: onlyNumber(val) } : r)));
  const deleteRow = (i: number) => setRows((rs) => rs.filter((_, idx) => idx !== i));
  const addRow = () => setRows((rs) => [...rs, { name: '', price: '' }]);
  const useItemsSum = () => setTotalStr(v.itemsSum ? String(v.itemsSum) : '');

  const save = () =>
    onSave({
      merchant: merchant.trim() || 'Unknown',
      date,
      items: numItems.filter((i) => i.name.length > 0 || i.price > 0),
      total: totalNum,
    });

  const bannerStyle =
    v.status === 'balanced' ? styles.ok : v.status === 'empty' ? styles.neutral : styles.warn;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionLabel}>Shop</Text>
      <TextInput
        style={styles.merchantInput}
        value={merchant}
        onChangeText={setMerchant}
        placeholder="Shop name"
      />

      {/* Live validation banner */}
      <View style={[styles.banner, bannerStyle]}>
        <Text style={styles.bannerText}>{v.message}</Text>
        <Text style={styles.bannerSub}>
          Items Rs {v.itemsSum.toFixed(2)}   •   Total Rs {totalNum.toFixed(2)}
          {v.status === 'short' || v.status === 'over' ? `   •   Δ Rs ${v.difference.toFixed(2)}` : ''}
        </Text>
      </View>

      <View style={styles.headRow}>
        <Text style={[styles.head, { flex: 1 }]}>Item name</Text>
        <Text style={[styles.head, styles.priceCol]}>Price</Text>
        <View style={styles.delCol} />
      </View>

      {rows.map((r, i) => {
        const suspect = isNameSuspect(r.name);
        return (
          <View key={i} style={styles.itemRow}>
            <TextInput
              style={[styles.nameInput, suspect && styles.nameSuspect]}
              value={r.name}
              onChangeText={(t) => updateName(i, t)}
              placeholder={suspect ? '⚠ check name…' : 'Item name'}
              placeholderTextColor={suspect ? '#C77700' : '#999'}
            />
            <TextInput
              style={styles.priceInput}
              value={r.price}
              onChangeText={(t) => updatePrice(i, t)}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
            <Pressable style={styles.delBtn} onPress={() => deleteRow(i)} hitSlop={8}>
              <Text style={styles.delText}>✕</Text>
            </Pressable>
          </View>
        );
      })}

      <Pressable style={styles.addBtn} onPress={addRow}>
        <Text style={styles.addText}>＋ Add item</Text>
      </Pressable>

      <View style={styles.divider} />

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>TOTAL  Rs</Text>
        <TextInput
          style={styles.totalInput}
          value={totalStr}
          onChangeText={(t) => setTotalStr(onlyNumber(t))}
          keyboardType="decimal-pad"
          placeholder="0.00"
        />
      </View>
      <Pressable onPress={useItemsSum}>
        <Text style={styles.useSum}>↺ Set total to items sum (Rs {v.itemsSum.toFixed(2)})</Text>
      </Pressable>

      <Pressable
        style={[styles.saveBtn, saving && { opacity: 0.6 }]}
        onPress={save}
        disabled={saving}
      >
        <Text style={styles.saveText}>{saving ? 'Saving…' : '💾 Save receipt'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E0E0E0' },
  sectionLabel: { fontSize: 12, color: '#888', marginBottom: 4, fontWeight: '600' },
  merchantInput: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  banner: { marginTop: 12, borderRadius: 10, padding: 10, borderWidth: 1 },
  ok: { backgroundColor: '#E6F4EA', borderColor: '#A5D6B7' },
  warn: { backgroundColor: '#FFF4E5', borderColor: '#FFCC80' },
  neutral: { backgroundColor: '#EEF1F5', borderColor: '#D5DCE4' },
  bannerText: { color: '#333', fontWeight: '600', fontSize: 13 },
  bannerSub: { color: '#666', fontSize: 12, marginTop: 3, fontVariant: ['tabular-nums'] },

  headRow: { flexDirection: 'row', marginTop: 14, marginBottom: 4, paddingHorizontal: 2 },
  head: { fontSize: 11, color: '#999', fontWeight: '700', textTransform: 'uppercase' },
  priceCol: { width: 92, textAlign: 'right' },
  delCol: { width: 28 },

  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  nameInput: { flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 14, color: '#222' },
  nameSuspect: { borderColor: '#F0A000', backgroundColor: '#FFFBF0' },
  priceInput: { width: 92, marginLeft: 8, borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, fontSize: 14, textAlign: 'right', color: '#222', fontVariant: ['tabular-nums'] },
  delBtn: { width: 28, alignItems: 'center', justifyContent: 'center' },
  delText: { color: '#C62828', fontSize: 16, fontWeight: '700' },

  addBtn: { marginTop: 4, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#BBDEFB', borderRadius: 8, backgroundColor: '#F3F8FF' },
  addText: { color: '#1976D2', fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 12 },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  totalInput: { width: 130, borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, fontWeight: '800', textAlign: 'right', color: '#2E7D32', fontVariant: ['tabular-nums'] },
  useSum: { color: '#1976D2', fontSize: 12, marginTop: 6, textAlign: 'right' },

  saveBtn: { marginTop: 16, backgroundColor: '#2E7D32', paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
