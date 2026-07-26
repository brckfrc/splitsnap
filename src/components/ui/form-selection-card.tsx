import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/card';
import { ChevronRight } from '@/lib/icons';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FormSectionProps = {
  title: string;
  children: React.ReactNode;
};

export function FormSection({ title, children }: FormSectionProps) {
  const t = useTheme();

  return (
    <Card style={styles.card}>
      <Text style={[styles.title, { color: t.mutedForeground }]}>
        {title.toUpperCase()}
      </Text>
      <View style={styles.content}>
        {children}
      </View>
    </Card>
  );
}

type FormSelectionFieldProps = {
  value: string | React.ReactNode;
  onPress: () => void;
  placeholder?: string;
};

export function FormSelectionField({ value, onPress, placeholder = 'Seçilmedi' }: FormSelectionFieldProps) {
  const t = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.pressable, { backgroundColor: t.inputBackground }]}
      accessibilityRole="button"
    >
      <View style={{ flex: 1 }}>
        {React.isValidElement(value) || typeof value !== 'string' ? (
          value
        ) : (
          <Text style={[styles.valueText, { color: value ? t.foreground : t.mutedForeground }]}>
            {value || placeholder}
          </Text>
        )}
      </View>
      <ChevronRight size={20} color={t.mutedForeground} />
    </Pressable>
  );
}

type AvatarStackProps = {
  avatars: string[];
  label: string;
};

export function AvatarStack({ avatars, label }: AvatarStackProps) {
  const t = useTheme();
  const maxAvatars = 4;
  const displayedAvatars = avatars.slice(0, maxAvatars);
  const remainingCount = avatars.length - maxAvatars;

  return (
    <View style={styles.stackContainer}>
      {avatars.length > 0 && (
        <View style={styles.avatarsRow}>
          {displayedAvatars.map((av, index) => (
            <View
              key={index}
              style={[
                styles.avatarBubble,
                {
                  backgroundColor: `${t.primary}18`,
                  borderColor: t.inputBackground,
                  zIndex: avatars.length - index,
                  marginLeft: index > 0 ? -10 : 0,
                },
              ]}
            >
              <Text style={styles.avatarText}>{av || '👤'}</Text>
            </View>
          ))}
          {remainingCount > 0 && (
            <View
              style={[
                styles.avatarBubble,
                {
                  backgroundColor: `${t.primary}30`,
                  borderColor: t.inputBackground,
                  zIndex: 0,
                  marginLeft: -10,
                },
              ]}
            >
              <Text style={[styles.avatarText, { fontSize: 10, fontWeight: '700' }]}>
                +{remainingCount}
              </Text>
            </View>
          )}
        </View>
      )}
      <Text style={[styles.valueText, { color: t.foreground }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  content: {
    gap: Spacing.three,
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 12,
    minHeight: 48,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  stackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBubble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
  },
});
