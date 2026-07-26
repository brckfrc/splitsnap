import { ArrowLeft, Check, Trash2 } from '@/lib/icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, TextInput } from 'react-native';
import Toast from 'react-native-toast-message';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { DatePickerModal } from '@/components/ui/date-picker-modal';
import { Input, KeyboardDoneToolbar, KEYBOARD_ACCESSORY_ID } from '@/components/ui/input';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { HorizontalAvatarPicker } from '@/components/ui/horizontal-avatar-picker';
import { FormSection, FormSelectionField, AvatarStack } from '@/components/ui/form-selection-card';
import { MemberAmountCard } from '@/components/ui/member-amount-card';
import { APP_TAB_BAR_CONTENT_INSET } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
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
  const { user } = useAuth();

  const expense = useSplitDataStore((s) => s.expenses.find((e) => e.id === eid));
  const shares = useExpenseShares(eid);

  const { members } = useGroupAggregates(gid);
  const activeMembers = members.filter((m) => !m.leftAt);

  const allPayers = useSplitDataStore((s) => s.expensePayers);
  const payers = useMemo(
    () => allPayers.filter((p) => p.expenseId === eid),
    [allPayers, eid],
  );

  const [paidBy, setPaidBy] = useState(() => {
    if (payers.length === 1) return payers[0].userId;
    if (payers.length > 1) {
      const sorted = [...payers].sort((a, b) => b.amount - a.amount);
      return sorted[0].userId;
    }
    return user?.id ?? activeMembers[0]?.userId ?? '';
  });
  const [payerType, setPayerType] = useState<'single' | 'multiple'>(() => {
    return payers.length > 1 ? 'multiple' : 'single';
  });
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>(() => {
    const obj: Record<string, string> = {};
    payers.forEach((p) => {
      obj[p.userId] = String(p.amount);
    });
    return obj;
  });
  const [showPayerBottomSheet, setShowPayerBottomSheet] = useState(false);
  const [showSplitBottomSheet, setShowSplitBottomSheet] = useState(false);
  const [focusedPayerField, setFocusedPayerField] = useState<string | null>(null);
  const [focusedSplitField, setFocusedSplitField] = useState<string | null>(null);

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
    if (payerType === 'single' && !paidBy) {
      Alert.alert('Eksik bilgi', 'Ödeyen kişiyi seçin.');
      hasError = true;
    }
    if (hasError) return;

    let finalPayerAmounts: Record<string, number> = {};
    if (payerType === 'single') {
      finalPayerAmounts = { [paidBy]: num };
    } else {
      let sum = 0;
      for (const m of activeMembers) {
        const v = parseFloat((payerAmounts[m.userId] ?? '0').replace(',', '.'));
        if (!Number.isNaN(v) && v > 0) {
          finalPayerAmounts[m.userId] = v;
          sum += v;
        }
      }
      if (Math.abs(sum - num) > 0.05) {
        Alert.alert('Ödeme tutarı uyuşmuyor', 'Ödeyenlerin toplam miktarı, harcama tutarına eşit olmalı.');
        return;
      }
    }

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
        payerAmounts: finalPayerAmounts,
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
          <FormSection title="Fiş">
            {receiptSignedUrl ? (
              <Image
                source={{ uri: receiptSignedUrl }}
                style={{ width: '100%', height: 180, borderRadius: 10 }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{ color: t.mutedForeground, fontSize: 13 }}>Fiş yükleniyor…</Text>
            )}
          </FormSection>
        ) : null}

        <FormSection title="Harcama Bilgileri">
          <View style={{ gap: Spacing.two }}>
            <Text style={{ color: t.foreground, fontSize: 14, fontWeight: '500' }}>Başlık</Text>
            <View style={styles.titleRow}>
              <Pressable
                onPress={() => setShowIconPicker(!showIconPicker)}
                style={[styles.iconBtnBig, { backgroundColor: t.inputBackground }]}
              >
                <Text style={{ fontSize: 24 }}>{displayIcon}</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Input value={title} onChangeText={setTitle} error={titleError ?? undefined} />
              </View>
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
        </FormSection>

        <FormSection title="Kim Ödedi">
          <FormSelectionField
            value={
              payerType === 'single'
                ? (() => {
                    const payer = activeMembers.find((m) => m.userId === paidBy);
                    return payer ? (
                      <AvatarStack avatars={[payer.user.avatar ?? '👤']} label={payer.user.name} />
                    ) : '';
                  })()
                : (() => {
                    const activePayers = activeMembers.filter((m) => {
                      const amountStr = payerAmounts[m.userId];
                      if (!amountStr) return false;
                      const parsed = parseFloat(amountStr.replace(',', '.'));
                      return !Number.isNaN(parsed) && parsed > 0;
                    });
                    return activePayers.length > 0 ? (
                      <AvatarStack
                        avatars={activePayers.map((m) => m.user.avatar ?? '👤')}
                        label={`${activePayers.length} Kişi Ödedi`}
                      />
                    ) : '';
                  })()
            }
            placeholder="Ödeyen Seçin"
            onPress={() => setShowPayerBottomSheet(true)}
          />
        </FormSection>

        <FormSection title="Bölüşüm">
          <FormSelectionField
            value={(() => {
              const activeParticipants = activeMembers.filter((m) => selected.has(m.userId));
              const label = splitType === 'equal'
                ? `Eşit (${selected.size} Kişi)`
                : `Manuel (${selected.size} Kişi)`;
              return activeParticipants.length > 0 ? (
                <AvatarStack
                  avatars={activeParticipants.map((m) => m.user.avatar ?? '👤')}
                  label={label}
                />
              ) : '';
            })()}
            onPress={() => setShowSplitBottomSheet(true)}
          />
        </FormSection>

        {/* ── Kim Ödedi BottomSheet ───────────────────────────────────────── */}
        <BottomSheet
          visible={showPayerBottomSheet}
          onClose={() => setShowPayerBottomSheet(false)}
          title="Kim Ödedi?"
        >
          <View style={{ gap: Spacing.four }}>
            <View style={[styles.segmentedControl, { backgroundColor: t.inputBackground }]}>
              {(['single', 'multiple'] as const).map((type) => {
                const isActive = payerType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setPayerType(type)}
                    style={[
                      styles.segmentButton,
                      isActive && {
                        backgroundColor: t.card,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        elevation: 2,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text style={{ color: t.foreground, fontWeight: '600', fontSize: 14 }}>
                      {type === 'single' ? '👤 Tek Kişi' : '👥 Birden Fazla'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {payerType === 'single' ? (
              <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: Spacing.two }}>
                  {activeMembers.map((m) => {
                    const isSelected = paidBy === m.userId;
                    return (
                      <Pressable
                        key={m.userId}
                        onPress={() => {
                          setPaidBy(m.userId);
                          setShowPayerBottomSheet(false);
                        }}
                        style={[
                          styles.choice,
                          {
                            borderColor: isSelected ? t.primary : 'transparent',
                            backgroundColor: isSelected ? `${t.primary}12` : t.inputBackground,
                          },
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                      >
                        <View style={[styles.avatar, { backgroundColor: `${t.primary}18` }]}>
                          <Text>{m.user.avatar ?? '👤'}</Text>
                        </View>
                        <Text style={{ color: t.foreground, fontWeight: '600', flex: 1 }}>{m.user.name}</Text>
                        {isSelected && <Check size={18} color={t.primary} />}
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            ) : (
              <View style={{ gap: Spacing.three }}>
                {/* Horizontal Avatar Picker for multiple payers selection */}
                <HorizontalAvatarPicker
                  members={activeMembers}
                  selectedIds={new Set(Object.keys(payerAmounts).filter((id) => parseFloat((payerAmounts[id] ?? '0').replace(',', '.')) > 0))}
                  onToggle={(userId) => {
                    setPayerAmounts((prev) => {
                      const copy = { ...prev };
                      const currentVal = parseFloat((copy[userId] ?? '0').replace(',', '.'));
                      if (currentVal > 0) {
                        copy[userId] = '';
                      } else {
                        copy[userId] = '0';
                      }
                      return copy;
                    });
                  }}
                  onSelectAll={() => {
                    setPayerAmounts(() => {
                      const copy: Record<string, string> = {};
                      activeMembers.forEach((m) => {
                        copy[m.userId] = '0';
                      });
                      return copy;
                    });
                  }}
                  onClearAll={() => setPayerAmounts({})}
                />

                <View style={[styles.inlineDivider, { backgroundColor: t.border }]} />

                {/* Vertical inputs list for active payers */}
                <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                  <View style={{ gap: Spacing.one }}>
                    {activeMembers
                      .filter((m) => {
                        const copy = { ...payerAmounts };
                        return copy[m.userId] !== undefined;
                      })
                      .map((m) => {
                        const raw = payerAmounts[m.userId] ?? '';
                        const totalPaidOthers = Object.entries(payerAmounts).reduce((sum, [id, val]) => {
                          if (id === m.userId) return sum;
                          const pv = parseFloat(val.replace(',', '.'));
                          return sum + (Number.isNaN(pv) ? 0 : pv);
                        }, 0);
                        const remaining = validTotal - totalPaidOthers;
                        const hasValue = raw.length > 0 && raw !== '0';
                        const showSuffix = validTotal > 0 && !hasValue;
                        return (
                          <MemberAmountCard
                            key={m.userId}
                            member={m}
                            value={raw === '0' ? '' : raw}
                            isFocused={focusedPayerField === m.userId}
                            onFocus={() => setFocusedPayerField(m.userId)}
                            onBlur={() => setFocusedPayerField(null)}
                            onChangeText={(v) => {
                              const sanitized = v.replace(/[^0-9.,]/g, '');
                              setPayerAmounts((prev) => ({ ...prev, [m.userId]: sanitized }));
                            }}
                            remainingAmount={showSuffix && remaining > 0 ? remaining : 0}
                            onFillRemaining={() => setPayerAmounts((prev) => ({ ...prev, [m.userId]: remaining.toFixed(2) }))}
                          />
                        );
                      })}
                  </View>
                </ScrollView>

                <Button onPress={() => setShowPayerBottomSheet(false)}>Tamam</Button>
              </View>
            )}
          </View>
        </BottomSheet>

        {/* ── Bölüşüm BottomSheet ─────────────────────────────────────────── */}
        <BottomSheet
          visible={showSplitBottomSheet}
          onClose={() => setShowSplitBottomSheet(false)}
          title="Nasıl Bölünecek?"
        >
          <View style={{ gap: Spacing.four }}>
            <View style={[styles.segmentedControl, { backgroundColor: t.inputBackground }]}>
              {(['equal', 'manual'] as const).map((type) => {
                const isActive = splitType === type;
                return (
                  <Pressable
                    key={type}
                    onPress={() => setSplitType(type)}
                    style={[
                      styles.segmentButton,
                      isActive && {
                        backgroundColor: t.card,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 2,
                        elevation: 2,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text style={{ color: t.foreground, fontWeight: '600', fontSize: 14 }}>
                      {type === 'equal' ? '⚖️ Eşit' : '✏️ Manuel'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Horizontal Avatar Picker for participant selection */}
            <HorizontalAvatarPicker
              members={activeMembers}
              selectedIds={selected}
              onToggle={(userId) => toggleParticipant(userId)}
              onSelectAll={() => setSelected(new Set(activeMembers.map((m) => m.userId)))}
              onClearAll={() => setSelected(new Set())}
            />

            <View style={[styles.inlineDivider, { backgroundColor: t.border }]} />

            {splitType === 'equal' ? (
              <View style={{ gap: Spacing.four }}>
                <Text style={{ color: t.mutedForeground, fontSize: 13, textAlign: 'center', marginVertical: Spacing.two }}>
                  {selected.size > 0 && amount
                    ? `Kişi başı düşen pay: ₺${perEqual.toFixed(2)}`
                    : 'Katılımcıları seçin ve tutar girin.'}
                </Text>
                <Button onPress={() => setShowSplitBottomSheet(false)}>Tamam</Button>
              </View>
            ) : (
              <View style={{ gap: Spacing.four }}>
                <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                  <View style={{ gap: Spacing.one }}>
                    {activeMembers
                      .filter((m) => selected.has(m.userId))
                      .map((m) => {
                        const raw = manual[m.userId] ?? '';
                        const memberVal = parseFloat((raw || '0').replace(',', '.'));
                        const remaining = validTotal - (manualTotal - (Number.isNaN(memberVal) ? 0 : memberVal));
                        const hasValue = raw.length > 0;
                        const showSuffix = validTotal > 0 && !hasValue;
                        return (
                          <MemberAmountCard
                            key={m.userId}
                            member={m}
                            value={raw}
                            isFocused={focusedSplitField === m.userId}
                            onFocus={() => setFocusedSplitField(m.userId)}
                            onBlur={() => setFocusedSplitField(null)}
                            onChangeText={(v) => handleManualInput(m.userId, v)}
                            remainingAmount={showSuffix && remaining > 0 ? remaining : 0}
                            onFillRemaining={() => setManual((prev) => ({ ...prev, [m.userId]: remaining.toFixed(2) }))}
                          />
                        );
                      })}
                  </View>
                </ScrollView>
                <Button onPress={() => setShowSplitBottomSheet(false)}>Tamam</Button>
              </View>
            )}
          </View>
        </BottomSheet>

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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    height: 44,
    alignItems: 'stretch',
  },
  segmentButton: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
  },
  inlineRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 14,
    borderWidth: 2,
  },
  inlineUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  kalanBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  inlineInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    height: 40,
    width: 110,
    paddingHorizontal: Spacing.three,
  },
  inlineInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  inlineDivider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 0,
    marginBottom: 0,
    opacity: 0.6,
  },
});
