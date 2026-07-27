import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
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
    <BottomSheet visible={visible} onClose={onClose} title="Gruba Katıl">
      <View style={styles.body}>
        <Text style={[styles.hint, { color: t.mutedForeground }]}>
          Davet kodunu girin. Size gönderilen mesajın veya bağlantının tamamını yapıştırmanız da yeterli.
        </Text>
        <Input
          label="Davet kodu"
          value={code}
          onChangeText={onChangeCode}
          placeholder="Örn. A1B2C3"
          autoCapitalize="characters"
          error={error}
          clearable
        />
        <View style={styles.actions}>
          <Button variant="secondary" flex={1} onPress={onClose} disabled={submitting}>
            İptal
          </Button>
          <Button flex={1} loading={submitting} onPress={onSubmit} disabled={!code.trim() || submitting}>
            Katıl
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.three,
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
});
