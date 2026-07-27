import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input, KeyboardDoneToolbar } from '@/components/ui/input';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MAX_GROUP_DESCRIPTION_LENGTH, MAX_GROUP_NAME_LENGTH } from '@/utils/validation';

type Props = {
  visible: boolean;
  name: string;
  description: string;
  onChangeName: (v: string) => void;
  onChangeDescription: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  error?: string;
};

export function CreateGroupModal({
  visible,
  name,
  description,
  onChangeName,
  onChangeDescription,
  onClose,
  onSubmit,
  submitting = false,
  error,
}: Props) {
  const t = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Yeni Grup">
      <KeyboardDoneToolbar />
      <View style={styles.body}>
        <Input
          label="Grup adı"
          value={name}
          onChangeText={onChangeName}
          placeholder="Örn. Hafta sonu gezisi"
          maxLength={MAX_GROUP_NAME_LENGTH}
        />
        <Input
          label="Açıklama (isteğe bağlı)"
          value={description}
          onChangeText={onChangeDescription}
          placeholder="Kısa not"
          multiline
          maxLength={MAX_GROUP_DESCRIPTION_LENGTH}
        />
        {error ? (
          <Text style={{ color: t.destructive }} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Button variant="secondary" flex={1} onPress={onClose} disabled={submitting}>
            İptal
          </Button>
          <Button flex={1} loading={submitting} onPress={onSubmit} disabled={!name.trim() || submitting}>
            Oluştur
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.four,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
});
