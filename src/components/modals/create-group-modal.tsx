import { Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  name: string;
  description: string;
  onChangeName: (v: string) => void;
  onChangeDescription: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function CreateGroupModal({
  visible,
  name,
  description,
  onChangeName,
  onChangeDescription,
  onClose,
  onSubmit,
}: Props) {
  const t = useTheme();
  return (
    <Modal visible={visible} animationType="slide" transparent accessibilityViewIsModal>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: t.card, borderColor: t.border }]}>
          <Text style={[styles.title, { color: t.foreground }]} accessibilityRole="header">
            Yeni Grup
          </Text>
          <Input label="Grup adı" value={name} onChangeText={onChangeName} placeholder="Örn. Hafta sonu gezisi" />
          <Input
            label="Açıklama (isteğe bağlı)"
            value={description}
            onChangeText={onChangeDescription}
            placeholder="Kısa not"
            multiline
          />
          <View style={styles.actions}>
            <Button variant="secondary" onPress={onClose} style={styles.flex}>
              İptal
            </Button>
            <Button onPress={onSubmit} style={styles.flex} disabled={!name.trim()}>
              Oluştur
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
    gap: Spacing.four,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
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
