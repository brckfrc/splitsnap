import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { href } from '@/lib/href';
import { useTheme } from '@/hooks/use-theme';

const items = [
  { key: 'groups', label: 'Gruplar', href: '/groups' as const, icon: 'people-outline' as const, iconActive: 'people' as const },
  { key: 'profile', label: 'Profil', href: '/profile' as const, icon: 'person-outline' as const, iconActive: 'person' as const },
];

type AppBottomBarProps = {
  onLogout: () => void;
};

export function AppBottomBar({ onLogout }: AppBottomBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/groups') return pathname === '/groups' || pathname.startsWith('/groups/');
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <View
      style={[
        styles.bar,
        {
          borderTopColor: t.border,
          backgroundColor: t.background,
          paddingBottom: Math.max(insets.bottom, Spacing.two),
        },
      ]}
    >
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            onPress={() => router.push(href(item.href))}
            style={styles.item}
          >
            <Ionicons name={active ? item.iconActive : item.icon} size={22} color={active ? t.primary : t.mutedForeground} />
            <Text style={[styles.label, { color: active ? t.primary : t.mutedForeground }]}>{item.label}</Text>
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Çıkış yap"
        onPress={onLogout}
        style={styles.item}
      >
        <Ionicons name="log-out-outline" size={22} color={t.destructive} />
        <Text style={[styles.label, { color: t.destructive }]}>Çıkış</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    minHeight: 48,
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
