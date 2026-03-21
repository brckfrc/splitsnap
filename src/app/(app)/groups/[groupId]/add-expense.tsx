import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { APP_TAB_BAR_CONTENT_INSET } from '@/constants/layout';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { href } from '@/lib/href';
import { splitData, useSplitDataStore } from '@/services/split-data';

export default function AddExpenseScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const gid = typeof groupId === 'string' ? groupId : groupId?.[0] ?? '';
  const t = useTheme();
  const { user } = useAuth();

  const members = useSplitDataStore((s) => s.getMembers(gid));
  const group = useSplitDataStore((s) => s.getGroup(gid));

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState<'equal' | 'manual'>('equal');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState<Record<string, string>>({});
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

  const defaultPayer = useMemo(() => {
    if (user && members.some((m) => m.userId === user.id)) return user.id;
    return members[0]?.userId ?? '';
  }, [user, members]);

  useEffect(() => {
    setPaidBy((p) => p || defaultPayer);
    setSelected(new Set(members.map((m) => m.userId)));
  }, [members, defaultPayer]);

  function toggleParticipant(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function pickReceipt() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('İzin gerekli', 'Galeri erişimi için izin verin.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      setReceiptUri(res.assets[0].uri);
    }
  }

  function submit() {
    const num = parseFloat(amount.replace(',', '.'));
    if (!title.trim() || !paidBy || Number.isNaN(num) || num <= 0) {
      Alert.alert('Eksik bilgi', 'Başlık, tutar ve ödeyen gerekli.');
      return;
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

    splitData.addExpense({
      groupId: gid,
      title,
      description,
      amount: num,
      date,
      paidBy,
      splitType,
      participantIds,
      manualAmounts,
      receiptImageUrl: receiptUri ?? undefined,
    });
    router.replace(href(`/groups/${gid}`));
  }

  if (!group) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: t.background }]}>
        <Text style={{ color: t.mutedForeground }}>Grup bulunamadı</Text>
      </SafeAreaView>
    );
  }

  const amountNum = parseFloat(amount.replace(',', '.'));
  const perEqual =
    splitType === 'equal' && selected.size > 0 && !Number.isNaN(amountNum)
      ? amountNum / selected.size
      : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.background }]} edges={['top']}>
      <View style={[styles.topBar, { borderBottomColor: t.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Geri"
          onPress={() => router.back()}
          style={styles.iconBtn}
        >
          <Ionicons name="arrow-back" size={22} color={t.foreground} />
        </Pressable>
        <Text style={[styles.topTitle, { color: t.foreground }]} accessibilityRole="header">
          Yeni Harcama
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: APP_TAB_BAR_CONTENT_INSET + Spacing.five }]}
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          <Text style={[styles.cardTitle, { color: t.foreground }]}>Fiş Fotoğrafı (İsteğe bağlı)</Text>
          {receiptUri ? (
            <View style={{ gap: Spacing.three }}>
              <Text style={{ color: t.mutedForeground }}>Görsel seçildi (OCR Hafta 8+).</Text>
              <Button variant="secondary" size="sm" onPress={() => setReceiptUri(null)}>
                Fotoğrafı Kaldır
              </Button>
            </View>
          ) : (
            <Pressable
              onPress={pickReceipt}
              style={[styles.upload, { borderColor: t.border, backgroundColor: t.inputBackground }]}
              accessibilityRole="button"
              accessibilityLabel="Fiş fotoğrafı seç"
            >
              <Ionicons name="camera-outline" size={32} color={t.mutedForeground} />
              <Text style={{ color: t.foreground, fontWeight: '600' }}>Fotoğraf Seç</Text>
              <Text style={{ color: t.mutedForeground, fontSize: 12, textAlign: 'center' }}>
                Gerçek OCR ve depolama sonraki sprintte
              </Text>
            </Pressable>
          )}
        </Card>

        <Card style={{ gap: Spacing.four }}>
          <Text style={[styles.cardTitle, { color: t.foreground }]}>Harcama Bilgileri</Text>
          <Input label="Başlık" value={title} onChangeText={setTitle} placeholder="örn. Akşam Yemeği" />
          <View style={{ gap: Spacing.two }}>
            <Text style={{ color: t.foreground, fontSize: 14, fontWeight: '500' }}>Açıklama (İsteğe bağlı)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Detaylar..."
              placeholderTextColor={t.mutedForeground}
              multiline
              style={[
                styles.textArea,
                { color: t.foreground, backgroundColor: t.inputBackground, borderColor: 'transparent' },
              ]}
            />
          </View>
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Input label="Tutar (₺)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" />
            </View>
            <View style={{ flex: 1 }}>
              <Input label="Tarih (YYYY-AA-GG)" value={date} onChangeText={setDate} placeholder="2026-03-19" />
            </View>
          </View>
        </Card>

        <Card>
          <Text style={[styles.cardTitle, { color: t.foreground }]}>Kim Ödedi?</Text>
          <View style={{ gap: Spacing.two }}>
            {members.map((m) => {
              const active = paidBy === m.userId;
              return (
                <Pressable
                  key={m.userId}
                  onPress={() => setPaidBy(m.userId)}
                  style={[
                    styles.choice,
                    {
                      borderColor: active ? t.primary : 'transparent',
                      backgroundColor: active ? `${t.primary}12` : t.inputBackground,
                    },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <View style={[styles.avatar, { backgroundColor: `${t.primary}18` }]}>
                    <Text>{m.user.avatar ?? '👤'}</Text>
                  </View>
                  <Text style={{ color: t.foreground, fontWeight: '600', flex: 1 }}>{m.user.name}</Text>
                </Pressable>
              );
            })}
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
              accessibilityState={{ selected: splitType === 'equal' }}
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
              accessibilityState={{ selected: splitType === 'manual' }}
            >
              <Text style={styles.splitEmoji}>✏️</Text>
              <Text style={{ color: t.foreground, fontWeight: '600' }}>Manuel</Text>
            </Pressable>
          </View>

          <Text style={{ color: t.mutedForeground, fontSize: 13, fontWeight: '600' }}>Katılımcılar</Text>
          <View style={{ gap: Spacing.two }}>
            {members.map((m) => {
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
                    <Input
                      label={`Pay — ${m.user.name}`}
                      value={manual[m.userId] ?? ''}
                      onChangeText={(v) => setManual((prev) => ({ ...prev, [m.userId]: v }))}
                      keyboardType="decimal-pad"
                      placeholder="0"
                    />
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
          <Button style={{ flex: 1 }} onPress={submit}>
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
  upload: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: Spacing.six,
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
});
