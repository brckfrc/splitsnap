import { ArrowLeft, Camera, ChevronDown, Image as ImageIcon } from '@/lib/icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DatePickerModal } from '@/components/ui/date-picker-modal';
import { Input, KeyboardDoneToolbar, KEYBOARD_ACCESSORY_ID } from '@/components/ui/input';
import { APP_TAB_BAR_CONTENT_INSET } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useGroupAggregates } from '@/hooks/use-group-aggregates';
import { useTheme } from '@/hooks/use-theme';
import { uploadReceipt } from '@/services/receipts';
import { parseReceipt, type ReceiptParseResult } from '@/services/receipt-parse';
import { splitData } from '@/services/split-data';
import { guessCategoryEmoji } from '@/utils/format';

const EMOJI_LIST = ['📝', '🍔', '🛒', '🚕', '🏠', '🎮', '🏥', '👕', '🐾', '🍻', '🎁', '✈️', '☕️', '🍿', '🎬'];

const MAX_EXPENSE_AMOUNT = 1_000_000;
const MAX_TITLE_LENGTH = 100;

export default function AddExpenseScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const gid = typeof groupId === 'string' ? groupId : groupId?.[0] ?? '';
  const t = useTheme();
  const { user } = useAuth();

  const { members, group } = useGroupAggregates(gid);
  const activeMembers = useMemo(() => members.filter((m) => !m.leftAt), [members]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [dateObj, setDateObj] = useState(() => new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const date = dateObj.toISOString().slice(0, 10);
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'manual'>('equal');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState<Record<string, string>>({});
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<ReceiptParseResult | null>(null);
  const [currencyWarning, setCurrencyWarning] = useState<string | null>(null);
  const [showPayerPicker, setShowPayerPicker] = useState(false);
  const [manualIcon, setManualIcon] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const displayIcon = manualIcon ?? guessCategoryEmoji(title);

  const defaultPayer = useMemo(() => {
    if (user && activeMembers.some((m) => m.userId === user.id)) return user.id;
    return activeMembers[0]?.userId ?? '';
  }, [user, activeMembers]);

  useEffect(() => {
    setPaidBy((p) => p || defaultPayer);
    setSelected(new Set(activeMembers.map((m) => m.userId)));
  }, [activeMembers, defaultPayer]);

  // -------------------------------------------------------------------------
  // Receipt capture + OCR autofill
  // -------------------------------------------------------------------------

  async function handleReceiptPicked(uri: string) {
    setReceiptUri(uri);
    setOcrResult(null);
    setCurrencyWarning(null);
    setOcrLoading(true);
    try {
      const result = await parseReceipt(uri);
      setOcrResult(result);
      // Detect non-TL currency — skip amount autofill and warn user
      const isForeignCurrency = result.currency != null && result.currency !== 'TRY';
      if (isForeignCurrency) {
        setCurrencyWarning(`Bu fiş ${result.currency} cinsinden — tutarı kendiniz girin.`);
      }
      // Autofill only empty fields so the user's own input is never overwritten
      if (result.merchantName && !title.trim()) setTitle(result.merchantName);
      if (!isForeignCurrency && result.total && !amount) setAmount(String(result.total));
      if (result.date) {
        const d = new Date(result.date);
        if (!isNaN(d.getTime()) && d <= new Date()) setDateObj(d);
      }
    } catch {
      // OCR/parse failed silently — user fills manually
    } finally {
      setOcrLoading(false);
    }
  }

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin gerekli', 'Kamera erişimi için izin verin.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      await handleReceiptPicked(res.assets[0].uri);
    }
  }

  async function pickFromGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin gerekli', 'Galeri erişimi için izin verin.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      await handleReceiptPicked(res.assets[0].uri);
    }
  }

  function removeReceipt() {
    setReceiptUri(null);
    setOcrResult(null);
    setOcrLoading(false);
    setCurrencyWarning(null);
  }

  // -------------------------------------------------------------------------
  // Manual split helpers
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  async function submit() {
    setTitleError(null);
    setAmountError(null);
    const num = parseFloat(amount.replace(',', '.'));
    if (!user) { Alert.alert('Oturum', 'Giriş yapmanız gerekir.'); return; }

    let hasError = false;
    if (!title.trim()) {
      setTitleError('Başlık gerekli.');
      hasError = true;
    } else if (title.trim().length > MAX_TITLE_LENGTH) {
      setTitleError(`Başlık en fazla ${MAX_TITLE_LENGTH} karakter olabilir.`);
      hasError = true;
    }
    if (Number.isNaN(num) || num <= 0) {
      setAmountError('Geçerli bir tutar girin.');
      hasError = true;
    } else if (num > MAX_EXPENSE_AMOUNT) {
      setAmountError(`Tutar en fazla ${MAX_EXPENSE_AMOUNT.toLocaleString('tr-TR')} ₺ olabilir.`);
      hasError = true;
    }
    if (!paidBy) { Alert.alert('Eksik bilgi', 'Ödeyen kişiyi seçin.'); hasError = true; }
    if (hasError) return;

    const participantIds = Array.from(selected);
    if (participantIds.length === 0) { Alert.alert('Katılımcı', 'En az bir katılımcı seçin.'); return; }

    let manualAmounts: Record<string, number> | undefined;
    if (splitType === 'manual') {
      manualAmounts = {};
      let sum = 0;
      for (const id of participantIds) {
        const v = parseFloat((manual[id] ?? '0').replace(',', '.'));
        if (!Number.isNaN(v) && v > 0) { manualAmounts[id] = v; sum += v; }
      }
      if (Math.abs(sum - num) > 0.05) {
        Alert.alert('Tutar uyuşmuyor', 'Manuel payların toplamı, harcama tutarına eşit olmalı.');
        return;
      }
    }

    setSubmitting(true);
    try {
      // Upload receipt first (if any), get the storage path
      let receiptStoragePath: string | undefined;
      if (receiptUri) {
        try {
          receiptStoragePath = await uploadReceipt(receiptUri, gid);
        } catch {
          // Upload failure is non-blocking — save expense without receipt
        }
      }

      await splitData.addExpense({
        groupId: gid,
        title,
        description,
        amount: num,
        date,
        paidBy,
        createdBy: user.id,
        splitType,
        icon: displayIcon,
        participantIds,
        manualAmounts,
        receiptStoragePath,
        ocrSuggestions: ocrResult ?? undefined,
      });
      router.back();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Harcama kaydedilemedi.';
      Alert.alert('Hata', msg);
    } finally {
      setSubmitting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

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

  if (!group) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: t.background }]}>
        <Text style={{ color: t.mutedForeground }}>Grup bulunamadı</Text>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background }]} edges={['top']}>
      <KeyboardDoneToolbar />
      <View style={[styles.topBar, { borderBottomColor: t.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri"
          onPress={() => router.back()}
          style={styles.iconBtn}
        >
          <ArrowLeft size={22} color={t.foreground} />
        </Pressable>
        <Text style={[styles.topTitle, { color: t.foreground }]} accessibilityRole="header">
          Yeni Harcama
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: APP_TAB_BAR_CONTENT_INSET + Spacing.five }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Harcama bilgileri ─────────────────────────────────────────── */}
        <Card style={{ gap: Spacing.four }}>
          <Text style={[styles.cardTitle, { color: t.foreground }]}>Harcama Bilgileri</Text>
          <View style={styles.titleRow}>
            <Pressable
              onPress={() => setShowIconPicker(!showIconPicker)}
              style={[styles.iconBtnBig, { backgroundColor: t.inputBackground }]}
              accessibilityRole="button"
              accessibilityLabel="İkon seç"
            >
              <Text style={{ fontSize: 24 }}>{displayIcon}</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Input
                label="Başlık"
                value={title}
                onChangeText={setTitle}
                placeholder="örn. Akşam Yemeği"
                error={titleError ?? undefined}
              />
            </View>
          </View>
          {showIconPicker && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconList}>
              {EMOJI_LIST.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => { setManualIcon(emoji); setShowIconPicker(false); }}
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
              style={[styles.textArea, { color: t.foreground, backgroundColor: t.inputBackground, borderColor: 'transparent' }]}
            />
          </View>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Input
                label="Tutar (₺)"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                error={amountError ?? undefined}
              />
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

        {/* ── Fiş fotoğrafı + OCR ──────────────────────────────────────── */}
        <Card style={{ gap: Spacing.three }}>
          <Text style={[styles.cardTitle, { color: t.foreground }]}>Fiş Fotoğrafı (İsteğe bağlı)</Text>

          {receiptUri ? (
            <View style={{ gap: Spacing.three }}>
              <View style={styles.receiptThumbWrap}>
                <Image source={{ uri: receiptUri }} style={styles.receiptThumb} resizeMode="cover" />
                {ocrLoading ? (
                  <View style={styles.ocrOverlay}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.ocrOverlayText}>Fiş okunuyor…</Text>
                  </View>
                ) : null}
              </View>

              {!ocrLoading && ocrResult ? (
                <Text style={{ color: currencyWarning ? '#D97706' : t.mutedForeground, fontSize: 13 }}>
                  {currencyWarning
                    ? `⚠️ ${currencyWarning}`
                    : `✓ Otomatik dolduruldu${ocrResult.total ? ` — ₺${ocrResult.total.toFixed(2)}` : ''}${ocrResult.date ? ` | ${ocrResult.date}` : ''}${ocrResult.merchantName ? ` | ${ocrResult.merchantName}` : ''}`}
                </Text>
              ) : null}

              <Button variant="secondary" size="sm" onPress={removeReceipt} disabled={ocrLoading}>
                Fotoğrafı Kaldır
              </Button>
            </View>
          ) : (
            <View style={styles.row2}>
              <Pressable
                onPress={() => void pickFromCamera()}
                style={[styles.uploadHalf, { borderColor: t.border, backgroundColor: t.inputBackground }]}
                accessibilityRole="button"
                accessibilityLabel="Kamerayla çek"
              >
                <Camera size={24} color={t.mutedForeground} />
                <Text style={{ color: t.foreground, fontWeight: '600', fontSize: 13 }}>Kamerayla Çek</Text>
              </Pressable>
              <Pressable
                onPress={() => void pickFromGallery()}
                style={[styles.uploadHalf, { borderColor: t.border, backgroundColor: t.inputBackground }]}
                accessibilityRole="button"
                accessibilityLabel="Galeriden seç"
              >
                <ImageIcon size={24} color={t.mutedForeground} />
                <Text style={{ color: t.foreground, fontWeight: '600', fontSize: 13 }}>Galeriden Seç</Text>
              </Pressable>
            </View>
          )}
        </Card>

        {/* ── Kim ödedi ─────────────────────────────────────────────────── */}
        <Card>
          <Text style={[styles.cardTitle, { color: t.foreground }]}>Kim Ödedi?</Text>
          {(() => {
            const payer = activeMembers.find((m) => m.userId === paidBy) ?? activeMembers[0];
            if (!payer) return null;
            return (
              <>
                <Pressable
                  onPress={() => setShowPayerPicker((p) => !p)}
                  style={[styles.choice, { borderColor: t.primary, backgroundColor: `${t.primary}12` }]}
                  accessibilityRole="button"
                  accessibilityLabel="Ödeyen kişiyi değiştir"
                >
                  <View style={[styles.avatar, { backgroundColor: `${t.primary}18` }]}>
                    <Text>{payer.user.avatar ?? '👤'}</Text>
                  </View>
                  <Text style={{ color: t.foreground, fontWeight: '600', flex: 1 }}>{payer.user.name}</Text>
                  <ChevronDown
                    size={18}
                    color={t.mutedForeground}
                    style={{ transform: [{ rotate: showPayerPicker ? '180deg' : '0deg' }] }}
                  />
                </Pressable>
                {showPayerPicker ? (
                  <View style={{ gap: Spacing.two, marginTop: Spacing.two }}>
                    {activeMembers
                      .filter((m) => m.userId !== paidBy)
                      .map((m) => (
                        <Pressable
                          key={m.userId}
                          onPress={() => { setPaidBy(m.userId); setShowPayerPicker(false); }}
                          style={[styles.choice, { borderColor: 'transparent', backgroundColor: t.inputBackground }]}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: false }}
                        >
                          <View style={[styles.avatar, { backgroundColor: `${t.primary}18` }]}>
                            <Text>{m.user.avatar ?? '👤'}</Text>
                          </View>
                          <Text style={{ color: t.foreground, fontWeight: '600', flex: 1 }}>{m.user.name}</Text>
                        </Pressable>
                      ))}
                  </View>
                ) : null}
              </>
            );
          })()}
        </Card>

        {/* ── Bölüşüm ──────────────────────────────────────────────────── */}
        <Card style={{ gap: Spacing.four }}>
          <Text style={[styles.cardTitle, { color: t.foreground }]}>Nasıl Bölünecek?</Text>
          <View style={styles.row2}>
            {(['equal', 'manual'] as const).map((type) => (
              <Pressable
                key={type}
                onPress={() => setSplitType(type)}
                style={[
                  styles.splitBox,
                  {
                    borderColor: splitType === type ? t.primary : 'transparent',
                    backgroundColor: splitType === type ? `${t.primary}12` : t.inputBackground,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: splitType === type }}
              >
                <Text style={styles.splitEmoji}>{type === 'equal' ? '⚖️' : '✏️'}</Text>
                <Text style={{ color: t.foreground, fontWeight: '600' }}>
                  {type === 'equal' ? 'Eşit' : 'Manuel'}
                </Text>
              </Pressable>
            ))}
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
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
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

        {/* ── Footer butonları ─────────────────────────────────────────── */}
        <View style={styles.footerBtns}>
          <Button variant="secondary" style={{ flex: 1 }} onPress={() => router.back()}>
            İptal
          </Button>
          <Button style={{ flex: 1 }} onPress={() => void submit()} loading={submitting} disabled={submitting}>
            Kaydet
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: { padding: Spacing.two },
  topTitle: { fontSize: 18, fontWeight: '700' },
  form: { padding: Spacing.five, gap: Spacing.five },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: Spacing.two },
  receiptThumbWrap: {
    position: 'relative',
    width: '100%',
    height: 160,
  },
  receiptThumb: {
    width: '100%',
    height: 160,
    borderRadius: 10,
  },
  ocrOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  ocrOverlayText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  uploadHalf: {
    flex: 1,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.four,
    minHeight: 72,
    fontSize: 16,
  },
  row2: { flexDirection: 'row', gap: Spacing.three },
  dateBtn: {
    borderRadius: 12,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    minHeight: 48,
    justifyContent: 'center',
    marginTop: Spacing.two,
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
  footerBtns: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.two },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three },
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
});
