import React from 'react';
import { StyleSheet, Text, View, Pressable, TextInput, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { formatShortName } from '@/utils/format';
import type { GroupMember } from '@/types';

type MemberAmountCardProps = {
  member: GroupMember;
  value: string;
  onChangeText: (text: string) => void;
  isFocused?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  remainingAmount?: number;
  onFillRemaining?: () => void;
  style?: StyleProp<ViewStyle>;
  inputWidth?: number;
};

export function MemberAmountCard({
  member,
  value,
  onChangeText,
  isFocused = false,
  onFocus,
  onBlur,
  remainingAmount = 0,
  onFillRemaining,
  style,
  inputWidth = 110,
}: MemberAmountCardProps) {
  const t = useTheme();

  return (
    <View
      style={[
        styles.inlineRowCard,
        {
          backgroundColor: t.inputBackground,
          borderColor: isFocused ? t.primary : 'transparent',
        },
        style,
      ]}
    >
      <View style={styles.inlineUser}>
        <View style={[styles.avatar, { backgroundColor: `${t.primary}18` }]}>
          <Text style={styles.avatarText}>{member.user.avatar ?? '👤'}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.nameText, { color: t.foreground }]} numberOfLines={1}>
            {formatShortName(member.user.name)}
          </Text>
          {remainingAmount > 0 && onFillRemaining && (
            <Pressable
              onPress={onFillRemaining}
              style={[styles.kalanBadge, { backgroundColor: `${t.primary}12` }]}
            >
              <Text style={{ color: t.primary, fontSize: 10, fontWeight: '700' }}>
                Kalanı Doldur: ₺{remainingAmount.toFixed(2)}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
      <View style={[styles.inlineInputWrapper, { backgroundColor: t.card, borderColor: t.border, width: inputWidth }]}>
        <Text style={{ color: t.mutedForeground, fontWeight: '700', fontSize: 14, marginRight: 2 }}>₺</Text>
        <TextInput
          value={value}
          onFocus={onFocus}
          onBlur={onBlur}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={t.mutedForeground}
          style={[styles.inlineInput, { color: t.foreground }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inlineRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 14,
    borderWidth: 2,
  },
  inlineUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
  },
  nameText: {
    fontWeight: '600',
    fontSize: 14,
  },
  kalanBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  inlineInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    height: 40,
    paddingHorizontal: Spacing.three,
  },
  inlineInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
});
