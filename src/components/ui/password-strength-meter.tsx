import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Info } from '@/lib/icons';
import {
  MIN_NEW_PASSWORD_LENGTH,
  passwordStrength,
} from '@/utils/validation';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function showCriteria() {
  Alert.alert(
    'Şifre Kuralları',
    `Zorunlu:\n• En az ${MIN_NEW_PASSWORD_LENGTH} karakter\n• En az bir harf\n• En az bir rakam\n\nİpucu: 12+ karakter ve bir sembol (!, ?, # …) şifreni daha da güçlendirir.`,
  );
}

/** Live 4-segment strength meter shown under a new-password field. */
export function PasswordStrengthMeter({ password }: { password: string }) {
  const t = useTheme();
  if (!password) return null;

  const strength = passwordStrength(password);
  const color =
    strength.score <= 2 ? t.destructive : strength.score === 3 ? '#E0A100' : t.positive;

  return (
    <View style={styles.row}>
      <View style={styles.bars}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[styles.bar, { backgroundColor: i < strength.score ? color : t.border }]}
          />
        ))}
      </View>
      <Text style={[styles.label, { color }]}>{strength.label}</Text>
      <Pressable
        onPress={showCriteria}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Şifre kurallarını göster"
      >
        <Info size={16} color={t.mutedForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: -Spacing.two,
  },
  bars: {
    flexDirection: 'row',
    gap: Spacing.one,
    flex: 1,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
