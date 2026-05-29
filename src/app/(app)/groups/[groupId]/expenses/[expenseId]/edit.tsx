import { ArrowLeft, Trash2 } from '@/lib/icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, TextInput } from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DatePickerModal } from '@/components/ui/date-picker-modal';
import { Input, KeyboardDoneToolbar, KEYBOARD_ACCESSORY_ID } from '@/components/ui/input';
import { APP_TAB_BAR_CONTENT_INSET } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useExpenseShares } from '@/hooks/use-expense-shares';
import { useTheme } from '@/hooks/use-theme';
import { getReceiptSignedUrl } from '@/services/receipts';
import { splitData, useSplitDataStore } from '@/services/split-data';
import { guessCategoryEmoji } from '@/utils/format';
import { useGroupAggregates } from '@/hooks/use-group-aggregates';

const EMOJI_LIST = ['📝', '🍔', '🛒', '🚕', '🏠', '🎮', '🏥', '👕', '🐾', '🍻', '🎁', '✈️', '☕️', '🍿', '🎬'];

export default function EditExpenseScreen() {
  const { groupId, expenseId } = useLocalSearchParams<{ groupId: string; expenseId: string }>();
  const gid = typeof groupId === 'string' ? groupId : groupId?.[0] ?? '';
  const eid = typeof expenseId === 'string' ? expenseId : expenseId?.[0] ?? '';
  const t = useTheme();

  const expense = useSplitDataStore((s) => s.expenses.find((e) => e.id === eid));
  const shares = useExpenseShares(eid);

  const { members } = useGroupAggregates(gid);
  const activeMembers = members.filter((m) => !m.leftAt);

  const [title, setTitle] = useState(expense?.title ?? '');
  const [description, setDescription] = useState(expense?.description ?? '');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [dateObj, setDateObj] = useState(() =>
    expense ? new Date(expense.date) : new Date(),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const date = dateObj.toISOString().slice(0, 10);
  const [saving, setSaving] = useState(false);

  const [splitType, setSplitType] = useState<'equal' | 'manual'>(expense?.splitType ?? 'equal');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(shares.map(s => s.userId)));
  const [manual, setManual] = useState<Record<string, string>>(() => {
    const obj: Record<string, string> = {};
    if (expense?.splitType === 'manual') {
      shares.forEach(s => {
        obj[s.userId] = String(s.amount);
      });
    }
    return obj;
  });

  const [manualIcon, setManualIcon] = useState<string | null>(expense?.icon ?? null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const displayIcon = manualIcon ?? guessCategoryEmoji(title);

  const [receiptSignedUrl, setReceiptSignedUrl] = useState<string | null>(null);
  useEffect(() => {
    if (expense?.receiptImageUrl) {
      void getReceiptSignedUrl(expense.receiptImageUrl).then(setReceiptSignedUrl);
    }
  }, [expense?.receiptImageUrl]);

  function handleManualInput(userId: string, raw: string) {
    const sanitized = raw.replace(/[^0-9.,]/g, '');
    const parsed = parseFloat((sanitized || '0').replace(',', '.'));
    if (!Number.isNaN(parsed) && validTotal > 0) {
      const othersTotal = Array.from(selected).reduce((sum, id) => {
        if (id === userId) return sum;
        const v = parseFloat((manual[id] ?? '0').replace(',', '.'));
        return sum + (Number.isNaN(v) ? 0 : v);
      }, 0);
      const maxForThis = Math.max(0, validTotal - othersTotal);
      if (parsed > maxForThis) {
        setManual((prev) => ({ ...prev, [userId]: maxForThis.toFixed(2) }));
        return;
      }
    }
    setManual((prev) => ({ ...prev, [userId]: sanitized }));
  }

  function toggleParticipant(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const amountNum = parseFloat(amount.replace(',', '.'));
  const validTotal = !Number.isNaN(amountNum) && amountNum > 0 ? amountNum : 0;
  const perEqual =
    splitType === 'equal' && selected.size > 0 && validTotal > 0
      ? validTotal / selected.size
      : 0;

  const manualTotal = useMemo(() => {
    let sum = 0;
    for (const id of selected) {
      const v = parseFloat((manual[id] ?? '0').replace(',', '.'));
      if (!Number.isNaN(v) && v > 0) sum += v;
    }
    return sum;
  }, [manual, selected]);

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
    setTitleError(null);
    setAmountError(null);
    const num = parseFloat(amount.replace(',', '.'));
    
    let hasError = false;
    if (!title.trim()) {
      setTitleError('Başlık gerekli.');
      hasError = true;
    }
    if (Number.isNaN(num) || num <= 0) {
      setAmountError('Geçerli bir tutar girin.');
      hasError = true;
    }
    
    if (hasError) return;
    const participantIds = Array.from(selected);
    if (participantIds.length === 0) {
      Alert.alert('Katılımcı', 'En az bir katılımcı seçin.');
      return;
    }
    let manualAmounts: Record<string, number> | undefined;
    if (splitType === 'manual') {
      manualAmounts = {};
      let sum = 0;
      for (const id of participantIds) {
        const v = parseFloat((manual[id] ?? '0').replace(',', '.'));
        if (!Number.isNaN(v) && v > 0) {
          manualAmounts[id] = v;
          sum += v;
        }
      }
      if (Math.abs(sum - num) > 0.05) {
        Alert.alert('Tutar uyuşmuyor', 'Manuel payların toplamı, harcama tutarına eşit olmalı.');
        return;
      }
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
        icon: displayIcon,
        splitType,
        participantIds,
        manualAmounts,
      });
      router.back();
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
              Toast.show({ type: 'success', text1: 'Harcama başarıyla silindi' });
              router.back();
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
      <KeyboardDoneToolbar />
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
          <Card style={{ gap: Spacing.three }}>
            <Text style={[styles.cardTitle, { color: t.foreground }]}>Fiş</Text>
            {receiptSignedUrl ? (
              <Image
                source={{ uri: receiptSignedUrl }}
                style={{ width: '100%', height: 180, borderRadius: 10 }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{ color: t.mutedForeground, fontSize: 13 }}>Fiş yükleniyor…</Text>
            )}
          </Card>
        ) : null}

        <Card style={{ gap: Spacing.four }}>
          <Text style={[styles.cardTitle, { color: t.foreground }]}>Harcama Bilgileri</Text>
          <View style={styles.titleRow}>
            <Pressable
              onPress={() => setShowIconPicker(!showIconPicker)}
              style={[styles.iconBtnBig, { backgroundColor: t.inputBackground }]}
            >
              <Text style={{ fontSize: 24 }}>{displayIcon}</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Input label="Başlık" value={title} onChangeText={setTitle} error={titleError ?? undefined} />
            </View>
          </View>
          {showIconPicker && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconList}>
              {EMOJI_LIST.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => {
                    setManualIcon(emoji);
                    setShowIconPicker(false);
                  }}
                  style={[styles.iconOption, { backgroundColor: manualIcon === emoji ? `${t.primary}22` : t.inputBackground }]}
                >
                  <Text style={{ fontSize: 20 }}>{emoji}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <View style={{ gap: Spacing.two }}>
            <Text style={{ color: t.foreground, fontSize: 14, fontWeight: '500' }}>Açıklama (İsteğe bağlı)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Detaylar..."
              placeholderTextColor={t.mutedForeground}
              multiline
              inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
              style={[
                styles.textArea,
                { color: t.foreground, backgroundColor: t.inputBackground, borderColor: 'transparent' },
              ]}
            />
          </View>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Input label="Tutar (₺)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" error={amountError ?? undefined} />
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

        <Card style={{ gap: Spacing.four }}>
          <Text style={[styles.cardTitle, { color: t.foreground }]}>Nasıl Bölünecek?</Text>
          <View style={styles.row2}>
            <Pressable
              onPress={() => setSplitType('equal')}
              style={[
                styles.splitBox,
                {
                  borderColor: splitType === 'equal' ? t.primary : 'transparent',
                  backgroundColor: splitType === 'equal' ? `${t.primary}12` : t.inputBackground,
                },
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.splitEmoji}>⚖️</Text>
              <Text style={{ color: t.foreground, fontWeight: '600' }}>Eşit</Text>
            </Pressable>
            <Pressable
              onPress={() => setSplitType('manual')}
              style={[
                styles.splitBox,
                {
                  borderColor: splitType === 'manual' ? t.primary : 'transparent',
                  backgroundColor: splitType === 'manual' ? `${t.primary}12` : t.inputBackground,
                },
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.splitEmoji}>✏️</Text>
              <Text style={{ color: t.foreground, fontWeight: '600' }}>Manuel</Text>
            </Pressable>
          </View>

          <Text style={{ color: t.mutedForeground, fontSize: 13, fontWeight: '600' }}>Katılımcılar</Text>
          <View style={{ gap: Spacing.two }}>
            {activeMembers.map((m) => {
              const on = selected.has(m.userId);
              return (
                <View key={m.userId} style={{ gap: Spacing.two }}>
                  <Pressable
                    onPress={() => toggleParticipant(m.userId)}
                    style={[
                      styles.choice,
                      {
                        borderColor: on ? t.primary : 'transparent',
                        backgroundColor: on ? `${t.primary}12` : t.inputBackground,
                      },
                    ]}
                  >
                    <View style={[styles.avatar, { backgroundColor: `${t.primary}18` }]}>
                      <Text>{m.user.avatar ?? '👤'}</Text>
                    </View>
                    <Text style={{ color: t.foreground, fontWeight: '600', flex: 1 }}>{m.user.name}</Text>
                    {on && splitType === 'equal' && amount ? (
                      <Text style={{ color: t.primary, fontWeight: '700' }}>₺{perEqual.toFixed(2)}</Text>
                    ) : null}
                  </Pressable>
                  {on && splitType === 'manual' ? (
                    (() => {
                      const raw = manual[m.userId] ?? '';
                      const memberVal = parseFloat((raw || '0').replace(',', '.'));
                      const remaining = validTotal - (manualTotal - (Number.isNaN(memberVal) ? 0 : memberVal));
                      const hasValue = raw.length > 0;
                      const showSuffix = validTotal > 0 && !hasValue;
                      return (
                        <Input
                          label={`Pay — ${m.user.name}`}
                          value={raw}
                          onChangeText={(v) => handleManualInput(m.userId, v)}
                          keyboardType="decimal-pad"
                          placeholder="0"
                          suffix={showSuffix ? `Kalan: ₺${remaining.toFixed(2)}` : undefined}
                          onSuffixPress={
                            showSuffix && remaining > 0
                              ? () => setManual((prev) => ({ ...prev, [m.userId]: remaining.toFixed(2) }))
                              : undefined
                          }
                        />
                      );
                    })()
                  ) : null}
                </View>
              );
            })}
          </View>
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
  iconBtnBig: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconList: { gap: Spacing.two, paddingBottom: Spacing.one },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.four,
    minHeight: 72,
    fontSize: 16,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitBox: {
    flex: 1,
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    gap: Spacing.two,
  },
  splitEmoji: { fontSize: 28 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three },

});
