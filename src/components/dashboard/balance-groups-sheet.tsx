import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ChevronRight } from '@/lib/icons';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { href } from '@/lib/href';
import { formatCurrency } from '@/utils/format';
import type { OwedGroup } from '@/hooks/use-dashboard-summary';

type BalanceGroupsSheetProps = {
  visible: boolean;
  variant: 'debt' | 'credit';
  groups: OwedGroup[];
  onClose: () => void;
};

export function BalanceGroupsSheet({ visible, variant, groups, onClose }: BalanceGroupsSheetProps) {
  const t = useTheme();

  const title = variant === 'debt' ? 'Ödenmemiş Borçların' : 'Alacakların';
  const amountColor = variant === 'debt' ? t.destructive : t.positive;
  const amountLabel = variant === 'debt' ? 'borç' : 'alacak';

  const handleSelect = (groupId: string) => {
    onClose();
    router.push(href(`/groups/${groupId}/settlement`));
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={{ gap: Spacing.one }}>
        {groups.map((item) => (
          <Pressable
            key={item.group.id}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.accent }]}
            onPress={() => handleSelect(item.group.id)}
          >
            <View style={[styles.avatar, { backgroundColor: t.accent }]}>
              <Text style={[styles.avatarText, { color: t.foreground }]}>
                {item.group.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.rowMain}>
              <Text style={[styles.groupName, { color: t.foreground }]} numberOfLines={1}>
                {item.group.name}
              </Text>
              <Text style={[styles.amount, { color: amountColor }]}>
                {formatCurrency(item.amount, item.currency)} {amountLabel}
              </Text>
            </View>
            <ChevronRight size={18} color={t.mutedForeground} />
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    borderRadius: 14,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowMain: {
    flex: 1,
    gap: 3,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
  },
  amount: {
    fontSize: 13,
    fontWeight: '500',
  },
});
