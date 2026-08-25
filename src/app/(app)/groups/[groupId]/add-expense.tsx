import { ArrowLeft, Camera, Check, Image as ImageIcon, ZoomIn } from '@/lib/icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { Button } from '@/components/ui/button';
import { DatePickerModal } from '@/components/ui/date-picker-modal';
import { Input, KeyboardDoneToolbar, KEYBOARD_ACCESSORY_ID } from '@/components/ui/input';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ImageViewerModal } from '@/components/ui/image-viewer-modal';
import { HorizontalAvatarPicker } from '@/components/ui/horizontal-avatar-picker';
import { FormSection, FormSelectionField, AvatarStack } from '@/components/ui/form-selection-card';
import { MemberAmountCard } from '@/components/ui/member-amount-card';
import { APP_TAB_BAR_CONTENT_INSET } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useGroupAggregates } from '@/hooks/use-group-aggregates';
import { useTheme } from '@/hooks/use-theme';
import { uploadReceipt } from '@/services/receipts';
import { parseReceipt, type ReceiptScan } from '@/services/receipt-parse';
import { splitData } from '@/services/split-data';
import { formatCurrency, guessCategoryEmoji } from '@/utils/format';
import { amountsMatch, parseAmount, validateAmount, validateExpenseTitle } from '@/utils/validation';

const EMOJI_LIST = ['📝', '🍔', '🛒', '🚕', '🏠', '🎮', '🏥', '👕', '🐾', '🍻', '🎁', '✈️', '☕️', '🍿', '🎬'];

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
  const [payerType, setPayerType] = useState<'single' | 'multiple'>('single');
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>({});
  const [splitType, setSplitType] = useState<'equal' | 'manual'>('equal');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState<Record<string, string>>({});
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrScan, setOcrScan] = useState<ReceiptScan | null>(null);
  const [receiptViewerOpen, setReceiptViewerOpen] = useState(false);
  const [currencyWarning, setCurrencyWarning] = useState<string | null>(null);
  const [showPayerBottomSheet, setShowPayerBottomSheet] = useState(false);
  const [showSplitBottomSheet, setShowSplitBottomSheet] = useState(false);
  const [focusedPayerField, setFocusedPayerField] = useState<string | null>(null);
  const [focusedSplitField, setFocusedSplitField] = useState<string | null>(null);
  const [manualIcon, setManualIcon] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const displayIcon = manualIcon ?? guessCategoryEmoji(title);

  const defaultPayer = useMemo(() => {
    if (user && activeMembers.some((m) => m.userId === user.id)) return user.id;
    return activeMembers[0]?.userId ?? '';
  }, [user, activeMembers]);

  // Sync defaults when member list loads (avoid setState-in-effect by using ref guard)
  const membersInitialized = useRef(false);
  useEffect(() => {
    if (activeMembers.length === 0) return;
    if (!membersInitialized.current) {
      membersInitialized.current = true;
      setPaidBy((p) => p || defaultPayer);
      setSelected(new Set(activeMembers.map((m) => m.userId)));
    }
  }, [activeMembers, defaultPayer]);

  // -------------------------------------------------------------------------
  // Receipt capture + OCR autofill
  // -------------------------------------------------------------------------

  /** Values the last scan wrote into the form, so a replacement receipt can
   *  overwrite them without clobbering anything the user typed. */
  const autofilledRef = useRef<{ title?: string; amount?: string }>({});
  /** Set once the user picks a date themselves; OCR stops touching it after. */
  const dateTouchedRef = useRef(false);

  async function handleReceiptPicked(uri: string) {
    setReceiptUri(uri);
    setOcrScan(null);
    setCurrencyWarning(null);
    setOcrLoading(true);
    try {
      const scan = await parseReceipt(uri);
      setOcrScan(scan);
      if (scan.status !== 'filled') return;

      const result = scan.result;
      // Detect non-TL currency — skip amount autofill and warn user
      const isForeignCurrency = result.currency != null && result.currency !== 'TRY';
      if (isForeignCurrency) {
        setCurrencyWarning(`Bu fiş ${result.currency} cinsinden, tutarı kendiniz girin.`);
      }

      // A field may be (re)filled while it is empty or still holds the value a
      // previous scan put there — anything the user typed since is theirs.
      const auto = autofilledRef.current;

      if (result.merchantName && (!title.trim() || title === auto.title)) {
        setTitle(result.merchantName);
        auto.title = result.merchantName;
      }

      if (!isForeignCurrency && result.total != null) {
        const next = String(result.total);
        if (!amount || amount === auto.amount) {
          setAmount(next);
          auto.amount = next;
        }
      }

      // The date field is never empty (it defaults to today), so ownership is
      // tracked by whether the user has opened the picker rather than by value.
      if (result.date && !dateTouchedRef.current) {
        const d = new Date(result.date);
        if (!isNaN(d.getTime()) && d <= new Date()) setDateObj(d);
      }
    } catch {
      setOcrScan({ status: 'failed', result: {} });
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
    setOcrScan(null);
    setOcrLoading(false);
    setCurrencyWarning(null);
    // Undo what the discarded receipt filled in, but keep the user's own edits.
    // The date is left alone: it has no empty state, so snapping it back to
    // today would just be another arbitrary value.
    const auto = autofilledRef.current;
    if (auto.title && title === auto.title) setTitle('');
    if (auto.amount && amount === auto.amount) setAmount('');
    autofilledRef.current = {};
  }

  /** Status line shown under the receipt thumbnail once the scan settles. */
  const ocrNotice: { tone: 'ok' | 'warn'; text: string } | null = (() => {
    if (!ocrScan) return null;
    if (currencyWarning) return { tone: 'warn', text: currencyWarning };

    switch (ocrScan.status) {
      case 'no_text':
        return {
          tone: 'warn',
          text: 'Görüntüde okunabilir yazı bulunamadı. Fiş fotoğrafı olduğundan emin olun, bilgileri elle girebilirsiniz.',
        };
      case 'empty':
        return {
          tone: 'warn',
          text: 'Fiş bilgileri okunamadı. Tutar ve tarihi elle girin.',
        };
      case 'failed':
        return {
          tone: 'warn',
          text: 'Fiş okunamadı. Fotoğraf yine de eklendi, bilgileri elle girin.',
        };
      case 'filled': {
        const { total, date, merchantName } = ocrScan.result;
        const detail = [
          total != null ? formatCurrency(total) : null,
          date,
          merchantName,
        ]
          .filter(Boolean)
          .join(' · ');
        if (total == null) {
          return { tone: 'warn', text: `Fiş okundu (${detail}) ama tutar bulunamadı, elle girin.` };
        }
        return { tone: 'ok', text: `Otomatik dolduruldu: ${detail}` };
      }
    }
  })();

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
    const num = parseAmount(amount);
    if (!user) { Alert.alert('Oturum', 'Giriş yapmanız gerekir.'); return; }

    let hasError = false;
    const titleErr = validateExpenseTitle(title);
    if (titleErr) {
      setTitleError(titleErr);
      hasError = true;
    }
    const amountErr = validateAmount(amount).error;
    if (amountErr) {
      setAmountError(amountErr);
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
      if (!amountsMatch(sum, num)) {
        Alert.alert('Ödeme tutarı uyuşmuyor', 'Ödeyenlerin toplam miktarı, harcama tutarına eşit olmalı.');
        return;
      }
    }

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
      if (!amountsMatch(sum, num)) {
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
          // Non-blocking: the expense is still worth saving, but say so —
          // silently dropping the receipt made this look like a viewer bug.
          Toast.show({
            type: 'error',
            text1: 'Fiş yüklenemedi',
            text2: 'Harcama kaydedildi ama fiş fotoğrafı yüklenemedi.',
            position: 'bottom',
          });
        }
      }

      await splitData.addExpense({
        groupId: gid,
        title,
        description,
        amount: num,
        date,
        paidBy: payerType === 'single' ? paidBy : undefined,
        createdBy: user.id,
        splitType,
        icon: displayIcon,
        participantIds,
        manualAmounts,
        payerAmounts: finalPayerAmounts,
        receiptStoragePath,
        ocrSuggestions: ocrScan?.status === 'filled' ? ocrScan.result : undefined,
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
        <FormSection title="Harcama Bilgileri">
          <View style={{ gap: Spacing.two }}>
            <Text style={{ color: t.foreground, fontSize: 14, fontWeight: '500' }}>Başlık</Text>
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
                  value={title}
                  onChangeText={setTitle}
                  placeholder="örn. Akşam Yemeği"
                  error={titleError ?? undefined}
                />
              </View>
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
                onConfirm={(d) => {
                  dateTouchedRef.current = true;
                  setDateObj(d);
                  setShowDatePicker(false);
                }}
                onCancel={() => setShowDatePicker(false)}
              />
            </View>
          </View>
        </FormSection>

        {/* ── Fiş fotoğrafı + OCR ──────────────────────────────────────── */}
        <FormSection title="Fiş Fotoğrafı (İsteğe bağlı)">

          {receiptUri ? (
            <View style={{ gap: Spacing.three }}>
              <Pressable
                style={[styles.receiptThumbWrap, { backgroundColor: t.inputBackground }]}
                onPress={() => setReceiptViewerOpen(true)}
                disabled={ocrLoading}
                accessibilityRole="button"
                accessibilityLabel="Fişi tam ekran aç"
              >
                <Image source={{ uri: receiptUri }} style={styles.receiptThumb} resizeMode="cover" />
                {ocrLoading ? (
                  <View style={styles.ocrOverlay}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.ocrOverlayText}>Fiş okunuyor…</Text>
                  </View>
                ) : (
                  <View style={styles.receiptZoomBadge}>
                    <ZoomIn size={16} color="#fff" />
                  </View>
                )}
              </Pressable>

              {!ocrLoading && ocrNotice ? (
                <Text
                  style={{
                    color: ocrNotice.tone === 'warn' ? '#D97706' : t.mutedForeground,
                    fontSize: 13,
                  }}
                >
                  {ocrNotice.tone === 'warn' ? `⚠️ ${ocrNotice.text}` : `✓ ${ocrNotice.text}`}
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
                <Text style={[styles.uploadHalfLabel, { color: t.foreground }]} numberOfLines={2}>
                  Kamerayla Çek
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void pickFromGallery()}
                style={[styles.uploadHalf, { borderColor: t.border, backgroundColor: t.inputBackground }]}
                accessibilityRole="button"
                accessibilityLabel="Galeriden seç"
              >
                <ImageIcon size={24} color={t.mutedForeground} />
                <Text style={[styles.uploadHalfLabel, { color: t.foreground }]} numberOfLines={2}>
                  Galeriden Seç
                </Text>
              </Pressable>
            </View>
          )}
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
        <View style={{ height: Spacing.four }} />

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

      <ImageViewerModal
        visible={receiptViewerOpen}
        uri={receiptUri}
        onClose={() => setReceiptViewerOpen(false)}
      />
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
    borderRadius: 10,
    overflow: 'hidden',
  },
  receiptThumb: {
    width: '100%',
    height: '100%',
  },
  receiptZoomBadge: {
    position: 'absolute',
    right: Spacing.two,
    bottom: Spacing.two,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
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
    // flex (not width: '50%') keeps the two halves equal without the row gap
    // pushing their combined width past the container.
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  uploadHalfLabel: {
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
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
