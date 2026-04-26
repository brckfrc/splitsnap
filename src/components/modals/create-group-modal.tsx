import { StyleSheet, Text } from 'react-native';
import { Sheet, XStack } from 'tamagui';

import { Button } from '@/components/ui/button';
import { Input, KeyboardDoneToolbar } from '@/components/ui/input';
import { useTheme } from '@/hooks/use-theme';

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
    <Sheet
      modal
      open={visible}
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}
      snapPoints={[50, 88]}
      snapPointsMode="percent"
      position={0}
      dismissOnOverlayPress
      dismissOnSnapToBottom
      moveOnKeyboardChange
    >
      <Sheet.Overlay bg="rgba(0,0,0,0.45)" />
      <Sheet.Frame
        p="$5"
        gap="$4"
        bg={t.card}
        borderTopLeftRadius={16}
        borderTopRightRadius={16}
        borderWidth={1}
        borderColor={t.border}
      >
        <KeyboardDoneToolbar />
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
        {error ? (
          <Text style={{ color: t.destructive }} accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <XStack gap="$3" mt="$2">
          <Button variant="secondary" flex={1} onPress={onClose} disabled={submitting}>
            İptal
          </Button>
          <Button flex={1} loading={submitting} onPress={onSubmit} disabled={!name.trim() || submitting}>
            Oluştur
          </Button>
        </XStack>
      </Sheet.Frame>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
});
