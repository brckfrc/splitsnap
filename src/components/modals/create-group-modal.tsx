import { StyleSheet, Text } from 'react-native';
import { Sheet, XStack } from 'tamagui';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
        <XStack gap="$3" mt="$2">
          <Button variant="secondary" flex={1} onPress={onClose}>
            İptal
          </Button>
          <Button flex={1} onPress={onSubmit} disabled={!name.trim()}>
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
