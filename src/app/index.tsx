import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/contexts/auth-context';
import { href } from '@/lib/href';

export default function Index() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.center} accessibilityLabel="Yükleniyor">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (user) {
    return <Redirect href={href('/groups')} />;
  }

  return <Redirect href={href('/login')} />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
