import { StyleSheet, Text } from 'react-native';
import { Sheet, XStack } from 'tamagui';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  code: string;
  onChangeCode: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  error?: string;
  submitting?: boolean;
};

export function JoinGroupModal({
  visible,
  code,
  onChangeCode,
  onClose,
  onSubmit,
  error,
  submitting = false,
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
        gap="$3"
        bg={t.card}
        borderTopLeftRadius={16}
        borderTopRightRadius={16}
        borderWidth={1}
        borderColor={t.border}
      >
        <Text style={[styles.title, { color: t.foreground }]} accessibilityRole="header">
          Gruba Katıl
        </Text>
        <Text style={[styles.hint, { color: t.mutedForeground }]}>
          Grup sahibinin paylaştığı davet kodunu girin (büyük harf, harf ve rakam).
        </Text>
        <Input
          label="Davet kodu"
          value={code}
          onChangeText={onChangeCode}
          placeholder="Örn. A1B2C3"
          autoCapitalize="characters"
          error={error}
        />
        <XStack gap="$3" mt="$2">
          <Button variant="secondary" flex={1} onPress={onClose} disabled={submitting}>
            İptal
          </Button>
          <Button flex={1} loading={submitting} onPress={onSubmit} disabled={!code.trim() || submitting}>
            Katıl
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
  hint: {
    fontSize: 14,
    lineHeight: 20,
  },
});
