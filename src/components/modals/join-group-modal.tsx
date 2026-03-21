import { Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  code: string;
  onChangeCode: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  error?: string;
};

export function JoinGroupModal({ visible, code, onChangeCode, onClose, onSubmit, error }: Props) {
  const t = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent accessibilityViewIsModal>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.title, { color: t.foreground }]} accessibilityRole="header">
            Gruba Katıl
          </Text>
          <Text style={[styles.hint, { color: t.mutedForeground }]}>
            Paylaşılan grup ID&apos;sini girin (ör. yeni oluşturulan grupların kimliği).
          </Text>
          <Input label="Grup ID" value={code} onChangeText={onChangeCode} placeholder="g-xxxxx" autoCapitalize="none" error={error} />
          <View style={styles.actions}>
            <Button variant="secondary" onPress={onClose} style={styles.flex}>
              İptal
            </Button>
            <Button onPress={onSubmit} style={styles.flex} disabled={!code.trim()}>
              Katıl
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    padding: Spacing.five,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    gap: Spacing.three,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  hint: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  flex: {
    flex: 1,
  },
});
