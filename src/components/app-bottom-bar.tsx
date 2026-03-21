import { LogOut, User, Users } from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { href } from '@/lib/href';

const items = [
  { key: 'groups', label: 'Gruplar', href: '/groups' as const, Icon: Users },
  { key: 'profile', label: 'Profil', href: '/profile' as const, Icon: User },
];

type AppBottomBarProps = {
  onLogout: () => void;
};

export function AppBottomBar({ onLogout }: AppBottomBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/groups') return pathname === '/groups' || pathname.startsWith('/groups/');
    return pathname === path || pathname.startsWith(`${path}/`);
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
        const color = active ? t.primary : t.mutedForeground;
        const Icon = item.Icon;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            onPress={() => router.push(href(item.href))}
            style={styles.item}
          >
            <Icon size={22} color={color} />
            <Text style={[styles.label, { color }]}>{item.label}</Text>
          </Pressable>
        );
      })}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Çıkış yap"
        onPress={onLogout}
        style={styles.item}
      >
        <LogOut size={22} color={t.destructive} />
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
