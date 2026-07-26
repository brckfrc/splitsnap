import React from 'react';
import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { Check } from '@/lib/icons';
import { formatShortName } from '@/utils/format';
import type { GroupMember } from '@/types';

type HorizontalAvatarPickerProps = {
  members: GroupMember[];
  selectedIds: Set<string>;
  onToggle: (userId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
};

export function HorizontalAvatarPicker({
  members,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
}: HorizontalAvatarPickerProps) {
  const t = useTheme();

  return (
    <View style={styles.container}>
      {/* Quick Select Buttons */}
      <View style={styles.actionRow}>
        <Text style={[styles.label, { color: t.mutedForeground }]}>Kişileri Seçin</Text>
        <View style={styles.btnRow}>
          <Pressable onPress={onSelectAll} accessibilityRole="button">
            <Text style={[styles.actionBtn, { color: t.primary }]}>Tümünü Seç</Text>
          </Pressable>
          <View style={[styles.separator, { backgroundColor: t.border }]} />
          <Pressable onPress={onClearAll} accessibilityRole="button">
            <Text style={[styles.actionBtn, { color: t.mutedForeground }]}>Temizle</Text>
          </Pressable>
        </View>
      </View>

      {/* Horizontal Scroll List */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {members.map((m) => {
          const isSelected = selectedIds.has(m.userId);
          const initials = m.user.name.slice(0, 2).toUpperCase();

          return (
            <Pressable
              key={m.userId}
              onPress={() => onToggle(m.userId)}
              style={styles.avatarWrapper}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            >
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: isSelected ? `${t.primary}20` : t.inputBackground,
                    borderColor: isSelected ? t.primary : 'transparent',
                    borderWidth: 2.5,
                  },
                ]}
              >
                <Text style={[styles.avatarText, { color: isSelected ? t.primary : t.foreground }]}>
                  {m.user.avatar || initials}
                </Text>
                {isSelected && (
                  <View style={[styles.badge, { backgroundColor: t.primary, borderColor: t.card }]}>
                    <Check size={10} color="#fff" strokeWidth={3} />
                  </View>
                )}
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.name,
                  { color: isSelected ? t.foreground : t.mutedForeground, fontWeight: isSelected ? '600' : '400' },
                ]}
              >
                {formatShortName(m.user.name)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    marginBottom: 0,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  actionBtn: {
    fontSize: 13,
    fontWeight: '600',
  },
  separator: {
    width: 1,
    height: 12,
  },
  scrollContent: {
    paddingHorizontal: Spacing.two,
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  avatarWrapper: {
    alignItems: 'center',
    width: 64,
    gap: Spacing.one,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  name: {
    fontSize: 12,
    textAlign: 'center',
    width: '100%',
  },
});
