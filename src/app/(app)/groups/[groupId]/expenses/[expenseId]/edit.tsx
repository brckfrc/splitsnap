import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DatePickerModal } from '@/components/ui/date-picker-modal';
import { Input } from '@/components/ui/input';
import { APP_TAB_BAR_CONTENT_INSET } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useExpenseShares } from '@/hooks/use-expense-shares';
import { useTheme } from '@/hooks/use-theme';
import { href } from '@/lib/href';
import { splitData, useSplitDataStore } from '@/services/split-data';
import { formatCurrencyTry } from '@/utils/format';

export default function EditExpenseScreen() {
  const { groupId, expenseId } = useLocalSearchParams<{ groupId: string; expenseId: string }>();
  const gid = typeof groupId === 'string' ? groupId : groupId?.[0] ?? '';
  const eid = typeof expenseId === 'string' ? expenseId : expenseId?.[0] ?? '';
  const t = useTheme();

  const expense = useSplitDataStore((s) => s.expenses.find((e) => e.id === eid));
  const shares = useExpenseShares(eid);

  const [title, setTitle] = useState(expense?.title ?? '');
  const [description, setDescription] = useState(expense?.description ?? '');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [dateObj, setDateObj] = useState(() =>
    expense ? new Date(expense.date) : new Date(),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const date = dateObj.toISOString().slice(0, 10);
  const [saving, setSaving] = useState(false);

  if (!expense) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: t.background }]}>
        <Text style={{ color: t.mutedForeground }}>Harcama bulunamadı</Text>
        <Button variant="secondary" onPress={() => router.back()} style={{ marginTop: Spacing.four }}>
          Geri
        </Button>
      </SafeAreaView>
    );
  }

  async function save() {
    const num = parseFloat(amount.replace(',', '.'));
    if (!title.trim() || Number.isNaN(num) || num <= 0) {
      Alert.alert('Hata', 'Geçerli başlık ve tutar girin.');
      return;
    }
    setSaving(true);
    try {
      await splitData.updateExpense({
        expenseId: eid,
        groupId: gid,
        title,
        description,
        amount: num,
        date,
      });
      router.replace(href(`/groups/${gid}`));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Kaydedilemedi.';
      Alert.alert('Hata', msg);
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    Alert.alert('Sil', 'Bu harcamayı silmek istediğinizden emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await splitData.deleteExpense(eid, gid);
              router.replace(href(`/groups/${gid}`));
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Silinemedi.';
              Alert.alert('Hata', msg);
            }
          })();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background }]} edges={['top']}>
      <View style={[styles.topBar, { borderBottomColor: t.border }]}>
        <Pressable accessibilityLabel="Geri" accessibilityRole="button" onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft size={22} color={t.foreground} />
        </Pressable>
        <Text style={[styles.topTitle, { color: t.foreground, flex: 1 }]} accessibilityRole="header">
          Harcama Detayı
        </Text>
        <Pressable accessibilityLabel="Harcamayı sil" accessibilityRole="button" onPress={remove} style={styles.iconBtn}>
          <Trash2 size={22} color={t.destructive} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: APP_TAB_BAR_CONTENT_INSET + Spacing.five }]}
        keyboardShouldPersistTaps="handled"
      >
        {expense.receiptImageUrl ? (
          <Card>
            <Text style={[styles.cardTitle, { color: t.foreground }]}>Fiş</Text>
            <Text style={{ color: t.mutedForeground }}>{expense.receiptImageUrl.slice(0, 80)}…</Text>
          </Card>
        ) : null}

        <Card style={{ gap: Spacing.four }}>
          <Input label="Başlık" value={title} onChangeText={setTitle} />
          <Input label="Açıklama" value={description} onChangeText={setDescription} />
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Input label="Tutar (₺)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.foreground, fontSize: 14, fontWeight: '500' }}>Tarih</Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={[styles.dateBtn, { backgroundColor: t.inputBackground }]}
                accessibilityRole="button"
                accessibilityLabel="Tarih seç"
              >
                <Text style={{ color: t.foreground, fontSize: 16 }}>
                  {dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </Pressable>
              <DatePickerModal
                visible={showDatePicker}
                value={dateObj}
                maximumDate={new Date()}
                onConfirm={(d) => { setDateObj(d); setShowDatePicker(false); }}
                onCancel={() => setShowDatePicker(false)}
              />
            </View>
          </View>
        </Card>

        <Card>
          <Text style={[styles.cardTitle, { color: t.foreground }]}>Paylaşım özeti</Text>
          {shares.map((s) => (
            <View key={s.userId} style={styles.shareRow}>
              <Text style={{ color: t.foreground, flex: 1 }}>{s.user?.name ?? s.userId}</Text>
              <Text style={{ color: t.primary, fontWeight: '700' }}>{formatCurrencyTry(s.amount)}</Text>
            </View>
          ))}
        </Card>

        <View style={styles.footerBtns}>
          <Button variant="secondary" style={{ flex: 1 }} onPress={() => router.back()}>
            İptal
          </Button>
          <Button style={{ flex: 1 }} onPress={() => void save()} loading={saving} disabled={saving}>
            Kaydet
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  iconBtn: { padding: Spacing.two },
  topTitle: { fontSize: 18, fontWeight: '700' },
  body: { padding: Spacing.five, gap: Spacing.five },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: Spacing.two },
  row2: { flexDirection: 'row', gap: Spacing.three },
  dateBtn: {
    borderRadius: 12,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  footerBtns: { flexDirection: 'row', gap: Spacing.three },
});
