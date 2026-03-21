import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppBottomBar } from '@/components/app-bottom-bar';
import { useAuth } from '@/contexts/auth-context';
import { href } from '@/lib/href';

export default function AppShellLayout() {
  const { user, initializing, signOutApp } = useAuth();

  if (initializing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" accessibilityLabel="Yükleniyor" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href={href('/login')} />;
  }

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }} />
      <AppBottomBar onLogout={() => void signOutApp()} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
